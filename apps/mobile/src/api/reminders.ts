import { apiGet, apiPost } from './http';
import { Reminder } from './types';

type RemindersResponse = {
  reminders: Reminder[];
};

export async function fetchReminders(): Promise<Reminder[]> {
  const res = await apiGet<RemindersResponse>('/api/reminders');
  return res.reminders ?? [];
}

export async function saveReminders(reminders: Reminder[]) {
  const res = await apiPost<RemindersResponse>('/api/reminders', {
    reminders,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return res.reminders ?? [];
}
