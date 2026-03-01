import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  dayjs.extend(utc);
  dayjs.extend(timezone);
  configured = true;
}

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    ensureConfigured();
    dayjs.tz('2026-01-01T00:00:00', value);
    return true;
  } catch {
    return false;
  }
}

export function resolveTimezone(value: string | null | undefined) {
  const fallback = process.env.TZ || 'UTC';
  return isValidTimezone(value) ? value : fallback;
}

export function nowInTimezone(timezoneName: string, at = new Date()) {
  ensureConfigured();
  return dayjs(at).tz(resolveTimezone(timezoneName));
}

export function dateISOInTimezone(timezoneName: string, at = new Date()) {
  return nowInTimezone(timezoneName, at).format('YYYY-MM-DD');
}

export function parseHHMM(value: string | null | undefined) {
  if (!value) return null;
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function minutesFromHHMM(value: string) {
  const parsed = parseHHMM(value);
  if (!parsed) return null;
  return parsed.hour * 60 + parsed.minute;
}
