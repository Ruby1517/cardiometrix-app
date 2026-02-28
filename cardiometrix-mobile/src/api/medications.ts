import { apiGet, apiPost, request } from './http';
import { mapMedicationWithAdherence } from './mappers';
import { Medication as MedicationModel } from './types';

export type MedicationListResponse = {
  medications: any[];
};

export type MedicationWithAdherence = {
  id: string;
  medication: MedicationModel;
  streak: number;
  last7: { date: string; status: 'taken' | 'missed' | null }[];
};

export type MedicationPayload = {
  name: string;
  dose: string;
  schedule: string;
};

export async function fetchMedications() {
  const data = await apiGet<MedicationListResponse>('/api/medications');
  return data.medications.map(mapMedicationWithAdherence) as MedicationWithAdherence[];
}

export async function createMedication(payload: MedicationPayload) {
  return apiPost('/api/medications', payload);
}

export async function updateMedication(id: string, payload: MedicationPayload) {
  return request({ method: 'PUT', path: `/api/medications/${id}`, body: payload });
}

export async function logAdherence(medicationId: string, status: 'taken' | 'missed') {
  return apiPost('/api/adherence', { medicationId, status });
}
