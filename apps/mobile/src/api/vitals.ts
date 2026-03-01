import { apiGet, apiPost } from './http';
import { enqueueItem } from '../store/offlineQueue';
import { isOnline } from '../utils/network';
import { mapVitalEntry } from './mappers';
import { VitalEntry } from './types';

export type VitalsListResponse = {
  entries: any[];
};

export type VitalsCreatePayload = {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  weight?: number;
  steps?: number;
  sleepMinutes?: number;
  hr?: number;
  hrv?: number;
  measuredAt?: string;
  source?: string;
};

export async function fetchVitals(limit = 100) {
  const data = await apiGet<VitalsListResponse>(`/api/vitals?limit=${limit}`);
  return data.entries.map(mapVitalEntry) as VitalEntry[];
}

export async function createVitals(payload: VitalsCreatePayload) {
  const online = await isOnline();
  if (!online) {
    await enqueueItem('vitals', payload);
    return { queued: true };
  }
  try {
    await apiPost('/api/vitals', payload);
    return { queued: false };
  } catch (error) {
    await enqueueItem('vitals', payload);
    return { queued: true, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function importVitals(entries: VitalsCreatePayload[]) {
  return apiPost('/api/vitals/import', { entries });
}
