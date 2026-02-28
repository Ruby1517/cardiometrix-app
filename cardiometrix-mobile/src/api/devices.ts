import { apiPost } from './http';
import { DeviceRegisterPayload } from './types';

export async function registerDevice(payload: DeviceRegisterPayload) {
  return apiPost('/api/devices/register', payload);
}

export async function sendTestNotification() {
  return apiPost('/api/devices/test-notification');
}
