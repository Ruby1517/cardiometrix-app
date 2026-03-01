import { apiGet, apiPost } from './http';
import { enqueueItem } from '../store/offlineQueue';
import { isOnline } from '../utils/network';
import { mapSymptomEntry } from './mappers';
import { SymptomEntry } from './types';

export type SymptomsListResponse = {
  entries: any[];
};

export type SymptomCreatePayload = {
  checkedAt?: string;
  severity: number;
  symptoms: {
    headache: boolean;
    dizziness: boolean;
    fatigue: boolean;
    chestDiscomfort: boolean;
    shortnessOfBreath: boolean;
    swelling: boolean;
    otherText?: string;
  };
  notes?: string;
};

export async function fetchSymptoms(limit = 50) {
  const data = await apiGet<SymptomsListResponse>(`/api/symptoms?limit=${limit}`);
  return data.entries.map(mapSymptomEntry) as SymptomEntry[];
}

export async function createSymptom(payload: SymptomCreatePayload) {
  const online = await isOnline();
  if (!online) {
    await enqueueItem('symptoms', payload);
    return { queued: true };
  }
  try {
    await apiPost('/api/symptoms', payload);
    return { queued: false };
  } catch (error) {
    await enqueueItem('symptoms', payload);
    return { queued: true, error: error instanceof Error ? error.message : 'Network error' };
  }
}
