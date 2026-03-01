import cron from 'node-cron';
import Reminder from '@/models/Reminder';
import Device from '@/models/Device';
import DailyNudge from '@/models/DailyNudge';

const DEFAULT_EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ReminderLike = {
  _id: unknown;
  userId: unknown;
  type: 'vitals' | 'meds';
  time: string;
  enabled?: boolean;
  timezone?: string | null;
  lastSentLocalDate?: string;
};

type DueReminder = {
  reminderId: unknown;
  userId: string;
  type: 'vitals' | 'meds';
  localDate: string;
  timezone: string;
};

export type ReminderPushDispatchStats = {
  scanned: number;
  due: number;
  sent: number;
  skippedNoDevice: number;
  failed: number;
};

export type ReminderPushDeps = {
  fetchReminders: () => Promise<ReminderLike[]>;
  fetchActiveDevices: (userIds: string[]) => Promise<Array<{ userId: string; expoPushToken: string }>>;
  fetchDailyNudges: (userIds: string[], localDates: string[]) => Promise<Array<{ userId: string; as_of_date: string; text: string }>>;
  sendExpo: (messages: ExpoPushMessage[]) => Promise<void>;
  markReminderSent: (reminderId: unknown, localDate: string, sentAt: Date) => Promise<void>;
  logger: Pick<Console, 'info' | 'error'>;
};

type ExpoPushMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: { type: 'vitals' | 'meds'; date: string };
};

function parseTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function getLocalClockParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  const year = map.get('year');
  const month = map.get('month');
  const day = map.get('day');
  const hour = Number(map.get('hour'));
  const minute = Number(map.get('minute'));

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return {
    dateISO: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

function resolveTimezone(timezone: string | null | undefined) {
  const fallback = process.env.TZ || 'UTC';
  if (!timezone) return fallback;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return fallback;
  }
}

function dueReminders(reminders: ReminderLike[], now: Date) {
  const due: DueReminder[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const time = parseTime(reminder.time);
    if (!time) continue;

    const timezone = resolveTimezone(reminder.timezone);
    const local = getLocalClockParts(now, timezone);
    if (!local) continue;

    const isCurrentMinute = local.hour === time.hour && local.minute === time.minute;
    const notAlreadySentToday = reminder.lastSentLocalDate !== local.dateISO;

    if (isCurrentMinute && notAlreadySentToday) {
      due.push({
        reminderId: reminder._id,
        userId: String(reminder.userId),
        type: reminder.type,
        localDate: local.dateISO,
        timezone,
      });
    }
  }

  return due;
}

async function sendExpoMessages(messages: ExpoPushMessage[]) {
  if (!messages.length) return;
  const expoUrl = process.env.EXPO_PUSH_API_URL || DEFAULT_EXPO_PUSH_URL;
  const response = await fetch(expoUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'unknown');
    throw new Error(`expo_send_failed:${text}`);
  }
}

export async function dispatchDueReminderPushes(now = new Date(), deps?: Partial<ReminderPushDeps>): Promise<ReminderPushDispatchStats> {
  const resolved: ReminderPushDeps = {
    fetchReminders:
      deps?.fetchReminders ||
      (async () => {
        return (await Reminder.find({ enabled: true })
          .select('_id userId type time timezone enabled lastSentLocalDate')
          .lean()) as unknown as ReminderLike[];
      }),
    fetchActiveDevices:
      deps?.fetchActiveDevices ||
      (async (userIds: string[]) => {
        if (!userIds.length) return [];
        const rows = (await Device.find({
          userId: { $in: userIds },
          status: 'active',
          expoPushToken: { $exists: true, $ne: null },
        })
          .select('userId expoPushToken')
          .lean()) as unknown as Array<{ userId: unknown; expoPushToken?: string }>;

        return rows
          .filter((row) => typeof row.expoPushToken === 'string' && row.expoPushToken)
          .map((row) => ({ userId: String(row.userId), expoPushToken: String(row.expoPushToken) }));
      }),
    fetchDailyNudges:
      deps?.fetchDailyNudges ||
      (async (userIds: string[], localDates: string[]) => {
        if (!userIds.length || !localDates.length) return [];
        const rows = (await DailyNudge.find({
          userId: { $in: userIds },
          as_of_date: { $in: localDates },
        })
          .select('userId as_of_date text')
          .lean()) as unknown as Array<{ userId: unknown; as_of_date?: string; text?: string }>;

        return rows
          .filter((row) => typeof row.as_of_date === 'string' && typeof row.text === 'string')
          .map((row) => ({
            userId: String(row.userId),
            as_of_date: String(row.as_of_date),
            text: String(row.text),
          }));
      }),
    sendExpo: deps?.sendExpo || sendExpoMessages,
    markReminderSent:
      deps?.markReminderSent ||
      (async (reminderId: unknown, localDate: string, sentAt: Date) => {
        await Reminder.findByIdAndUpdate(reminderId, {
          $set: { lastSentAt: sentAt, lastSentLocalDate: localDate },
        });
      }),
    logger: deps?.logger || console,
  };

  const reminders = await resolved.fetchReminders();
  const due = dueReminders(reminders, now);

  const stats: ReminderPushDispatchStats = {
    scanned: reminders.length,
    due: due.length,
    sent: 0,
    skippedNoDevice: 0,
    failed: 0,
  };

  if (!due.length) return stats;

  const userIds = Array.from(new Set(due.map((entry) => entry.userId)));
  const localDates = Array.from(new Set(due.map((entry) => entry.localDate)));

  const [devices, nudgeRows] = await Promise.all([
    resolved.fetchActiveDevices(userIds),
    resolved.fetchDailyNudges(userIds, localDates),
  ]);

  const deviceByUser = new Map<string, string[]>();
  for (const device of devices) {
    const existing = deviceByUser.get(device.userId) || [];
    if (!existing.includes(device.expoPushToken)) existing.push(device.expoPushToken);
    deviceByUser.set(device.userId, existing);
  }

  const nudgeByKey = new Map<string, string>();
  for (const nudge of nudgeRows) {
    nudgeByKey.set(`${nudge.userId}:${nudge.as_of_date}`, nudge.text);
  }

  for (const entry of due) {
    const tokens = deviceByUser.get(entry.userId) || [];
    if (!tokens.length) {
      stats.skippedNoDevice += 1;
      resolved.logger.info('[reminderPushCron] skipped no active device', {
        userId: entry.userId,
        dateISO: entry.localDate,
        type: entry.type,
      });
      continue;
    }

    const nudgeText = nudgeByKey.get(`${entry.userId}:${entry.localDate}`);
    const fallbackTitle = entry.type === 'meds' ? 'Medication reminder' : 'CardioMetrix daily check-in';
    const fallbackBody = entry.type === 'meds' ? 'Log your meds or mark them taken.' : 'Add your vitals for today.';

    const title = entry.type === 'vitals' && nudgeText ? 'Your CardioMetrix nudge' : fallbackTitle;
    const body = nudgeText || fallbackBody;

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: { type: entry.type, date: entry.localDate },
    }));

    try {
      await resolved.sendExpo(messages);
      await resolved.markReminderSent(entry.reminderId, entry.localDate, now);
      stats.sent += 1;
      resolved.logger.info('[reminderPushCron] sent', {
        userId: entry.userId,
        dateISO: entry.localDate,
        type: entry.type,
        tokens: tokens.length,
      });
    } catch (error) {
      stats.failed += 1;
      resolved.logger.error('[reminderPushCron] send failed', {
        userId: entry.userId,
        dateISO: entry.localDate,
        type: entry.type,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  return stats;
}

export function createReminderPushRunner(deps?: Partial<ReminderPushDeps>) {
  const logger = deps?.logger || console;

  async function run(now = new Date()) {
    logger.info('[reminderPushCron] start', { at: now.toISOString() });
    const out = await dispatchDueReminderPushes(now, deps);
    logger.info('[reminderPushCron] complete', out);
    return out;
  }

  function start(schedule = process.env.DAILY_PUSH_CRON || '* * * * *') {
    if (!cron.validate(schedule)) {
      logger.error('[reminderPushCron] invalid schedule', { schedule });
      return null;
    }

    return cron.schedule(schedule, () => {
      run(new Date()).catch((error) => {
        logger.error('[reminderPushCron] run failed', { error: error instanceof Error ? error.message : 'unknown' });
      });
    });
  }

  return { run, start };
}

let started = false;
export function initReminderPushCron() {
  if (started) return;
  if (process.env.DISABLE_REMINDER_PUSH_CRON === 'true') return;
  started = true;
  createReminderPushRunner().start();
}
