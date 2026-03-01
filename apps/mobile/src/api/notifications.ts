import { apiGet, apiPost, apiPut } from './http';
import { NotificationSettingsResponse } from './types';

export async function registerPushToken(payload: {
  expoPushToken: string;
  timezone?: string;
  notifyTimeLocal?: string;
}) {
  return apiPost<{ ok: boolean; settings: NotificationSettingsResponse['settings'] }>('/api/push/register', payload);
}

export async function fetchNotificationSettings() {
  const res = await apiGet<NotificationSettingsResponse>('/api/settings/notifications');
  return res.settings;
}

export async function updateNotificationSettings(payload: {
  notifyEnabled: boolean;
  notifyTimeLocal: string;
  timezone: string;
}) {
  const res = await apiPut<{ ok: boolean; settings: NotificationSettingsResponse['settings'] }>(
    '/api/settings/notifications',
    payload,
  );
  return res.settings;
}
