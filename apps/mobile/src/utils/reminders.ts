import * as Notifications from 'expo-notifications';
import { Reminder } from '../api/types';

type ReminderCopy = {
  title: string;
  body: string;
};

const COPY: Record<Reminder['type'], ReminderCopy> = {
  vitals: {
    title: 'Time to log vitals',
    body: 'Add your BP and weight for today.',
  },
  meds: {
    title: 'Medication reminder',
    body: 'Log your meds or mark them taken.',
  },
};

export async function scheduleReminders(reminders: Reminder[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    const time = parseTime(reminder.time);
    if (!time) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: COPY[reminder.type].title,
        body: COPY[reminder.type].body,
        sound: undefined,
      },
      trigger: {
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      },
    });
  }
}

function parseTime(value: string) {
  const [hourString, minuteString] = value.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}
