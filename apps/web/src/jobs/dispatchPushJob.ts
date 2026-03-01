import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import UserSettings from '@/models/UserSettings';
import RiskDaily from '@/models/RiskDaily';
import DailyNudge from '@/models/DailyNudge';
import { dateISOInTimezone, minutesFromHHMM, nowInTimezone, resolveTimezone } from '@/lib/time';

type UserSettingsRow = {
  _id: unknown;
  userId: unknown;
  timezone?: string;
  notifyTimeLocal?: string;
  pushTokens?: string[];
  notifyEnabled?: boolean;
  lastNotifiedDate?: string;
};

type RiskRow = { userId: unknown; as_of_date: string; band?: 'green' | 'amber' | 'red' | 'unknown' };
type NudgeRow = { userId: unknown; as_of_date: string; text?: string };

type TicketMeta = { userId: string; token: string; settingId: unknown; localDate: string };

export type DispatchPushResult = {
  scanned: number;
  due: number;
  sentUsers: number;
  sentMessages: number;
  skipped: number;
  failed: number;
};

export type DispatchPushDeps = {
  fetchSettings: () => Promise<UserSettingsRow[]>;
  fetchTodayRisk: (userIds: string[], localDates: string[]) => Promise<RiskRow[]>;
  fetchTodayNudges: (userIds: string[], localDates: string[]) => Promise<NudgeRow[]>;
  sendBatch: (messages: ExpoPushMessage[]) => Promise<ExpoPushTicket[]>;
  updateSettings: (settingId: unknown, update: { localDate: string; now: Date; invalidTokens: string[] }) => Promise<void>;
  logger: Pick<Console, 'info' | 'error'>;
};

function isDueNow(notifyTimeLocal: string | undefined, timezone: string, now: Date, windowMinutes: number) {
  const targetMinutes = minutesFromHHMM(notifyTimeLocal || '09:00');
  if (targetMinutes === null) return false;

  const local = nowInTimezone(timezone, now);
  const nowMinutes = local.hour() * 60 + local.minute();
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + windowMinutes;
}

function composeBody(params: { band?: string; nudgeText?: string }) {
  const bandCopy =
    params.band === 'red'
      ? 'Today looks high risk'
      : params.band === 'amber'
        ? 'Today looks moderate risk'
        : params.band === 'green'
          ? 'Today looks stable'
          : 'Today update is ready';

  const nudge = (params.nudgeText || '').trim();
  if (!nudge) return bandCopy;

  const joined = `${bandCopy}. ${nudge}`;
  return joined.length > 120 ? `${joined.slice(0, 117)}...` : joined;
}

export async function runDispatchPushJob(options?: {
  now?: Date;
  windowMinutes?: number;
  deps?: Partial<DispatchPushDeps>;
}): Promise<DispatchPushResult> {
  const now = options?.now || new Date();
  const windowMinutes = Math.max(1, options?.windowMinutes || 5);
  const expo = new Expo(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined);

  const deps: DispatchPushDeps = {
    fetchSettings:
      options?.deps?.fetchSettings ||
      (async () => {
        return (await UserSettings.find({ notifyEnabled: true, 'pushTokens.0': { $exists: true } })
          .select('_id userId timezone notifyTimeLocal pushTokens notifyEnabled lastNotifiedDate')
          .lean()) as unknown as UserSettingsRow[];
      }),
    fetchTodayRisk:
      options?.deps?.fetchTodayRisk ||
      (async (userIds: string[], localDates: string[]) => {
        if (!userIds.length || !localDates.length) return [];
        return (await RiskDaily.find({ userId: { $in: userIds }, as_of_date: { $in: localDates } })
          .select('userId as_of_date band')
          .lean()) as unknown as RiskRow[];
      }),
    fetchTodayNudges:
      options?.deps?.fetchTodayNudges ||
      (async (userIds: string[], localDates: string[]) => {
        if (!userIds.length || !localDates.length) return [];
        return (await DailyNudge.find({ userId: { $in: userIds }, as_of_date: { $in: localDates } })
          .select('userId as_of_date text')
          .lean()) as unknown as NudgeRow[];
      }),
    sendBatch: options?.deps?.sendBatch || (async (messages: ExpoPushMessage[]) => expo.sendPushNotificationsAsync(messages)),
    updateSettings:
      options?.deps?.updateSettings ||
      (async (settingId, update) => {
        const next: Record<string, unknown> = {
          lastNotifiedAt: update.now,
          lastNotifiedDate: update.localDate,
        };
        if (update.invalidTokens.length) {
          next.$pull = { pushTokens: { $in: update.invalidTokens } };
        }

        await UserSettings.findByIdAndUpdate(settingId, update.invalidTokens.length
          ? { $set: { lastNotifiedAt: update.now, lastNotifiedDate: update.localDate }, $pull: { pushTokens: { $in: update.invalidTokens } } }
          : { $set: next });
      }),
    logger: options?.deps?.logger || console,
  };

  const settings = await deps.fetchSettings();
  const dueSettings = settings
    .map((row) => {
      const userId = String(row.userId);
      const timezone = resolveTimezone(row.timezone || 'America/Los_Angeles');
      const localDate = dateISOInTimezone(timezone, now);
      const isDue = Boolean(row.notifyEnabled) && isDueNow(row.notifyTimeLocal, timezone, now, windowMinutes) && row.lastNotifiedDate !== localDate;
      return {
        row,
        userId,
        timezone,
        localDate,
        isDue,
      };
    })
    .filter((entry) => entry.isDue);

  if (!dueSettings.length) {
    return { scanned: settings.length, due: 0, sentUsers: 0, sentMessages: 0, skipped: settings.length, failed: 0 };
  }

  const userIds = Array.from(new Set(dueSettings.map((entry) => entry.userId)));
  const localDates = Array.from(new Set(dueSettings.map((entry) => entry.localDate)));

  const [riskRows, nudgeRows] = await Promise.all([
    deps.fetchTodayRisk(userIds, localDates),
    deps.fetchTodayNudges(userIds, localDates),
  ]);

  const riskByKey = new Map(riskRows.map((row) => [`${String(row.userId)}:${row.as_of_date}`, row]));
  const nudgeByKey = new Map(nudgeRows.map((row) => [`${String(row.userId)}:${row.as_of_date}`, row]));

  const messages: ExpoPushMessage[] = [];
  const metas: TicketMeta[] = [];
  const invalidBySetting = new Map<string, Set<string>>();

  for (const entry of dueSettings) {
    const tokens = Array.from(new Set((entry.row.pushTokens || []).filter(Boolean)));
    if (!tokens.length) continue;

    const key = `${entry.userId}:${entry.localDate}`;
    const risk = riskByKey.get(key);
    const nudge = nudgeByKey.get(key);
    const body = composeBody({ band: risk?.band, nudgeText: nudge?.text });

    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token)) {
        const settingKey = String(entry.row._id);
        const set = invalidBySetting.get(settingKey) || new Set<string>();
        set.add(token);
        invalidBySetting.set(settingKey, set);
        continue;
      }

      messages.push({
        to: token,
        title: 'Cardiometrix',
        body,
        sound: 'default',
        data: { screen: 'Home' },
      });
      metas.push({
        userId: entry.userId,
        token,
        settingId: entry.row._id,
        localDate: entry.localDate,
      });
    }
  }

  let sentMessages = 0;
  let failed = 0;

  let cursor = 0;
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await deps.sendBatch(chunk);
      sentMessages += chunk.length;

      tickets.forEach((ticket, index) => {
        const meta = metas[cursor + index];
        if (!meta) return;

        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const key = String(meta.settingId);
          const set = invalidBySetting.get(key) || new Set<string>();
          set.add(meta.token);
          invalidBySetting.set(key, set);
        }
      });
    } catch (error) {
      failed += chunk.length;
      deps.logger.error('[dispatchPushJob] push chunk failed', { error: error instanceof Error ? error.message : 'unknown' });
    }
    cursor += chunk.length;
  }

  const groupedBySetting = new Map<string, { settingId: unknown; localDate: string }>();
  for (const meta of metas) {
    const key = String(meta.settingId);
    if (!groupedBySetting.has(key)) groupedBySetting.set(key, { settingId: meta.settingId, localDate: meta.localDate });
  }

  for (const entry of groupedBySetting.values()) {
    const invalidTokens = Array.from(invalidBySetting.get(String(entry.settingId)) || []);
    await deps.updateSettings(entry.settingId, { localDate: entry.localDate, now, invalidTokens });
  }

  for (const [settingId, tokens] of invalidBySetting.entries()) {
    if (!groupedBySetting.has(settingId)) continue;
    deps.logger.info('[dispatchPushJob] removed invalid tokens', { settingId, count: tokens.size });
  }

  return {
    scanned: settings.length,
    due: dueSettings.length,
    sentUsers: groupedBySetting.size,
    sentMessages,
    skipped: Math.max(0, settings.length - dueSettings.length),
    failed,
  };
}
