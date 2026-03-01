import UserSettings from '@/models/UserSettings';
import { resolveTimezone } from '@/lib/time';

export const DEFAULT_NOTIFY_TIME = '09:00';
export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

export async function getOrCreateUserSettings(userId: string) {
  const existing = await UserSettings.findOne({ userId }).lean();
  if (existing) return existing;

  const doc = await UserSettings.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        timezone: DEFAULT_TIMEZONE,
        notifyTimeLocal: DEFAULT_NOTIFY_TIME,
        notifyEnabled: true,
        pushTokens: [],
      },
    },
    { upsert: true, new: true },
  ).lean();

  return doc;
}

export function normalizeUserTimezone(value: string | null | undefined) {
  return resolveTimezone(value || DEFAULT_TIMEZONE);
}
