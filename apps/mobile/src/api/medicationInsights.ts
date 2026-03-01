import { apiGet } from './http';

export type MedicationInsight = {
  medicationId: string;
  name: string;
  dose: string;
  schedule: string;
  startDate: string;
  adherenceRate: number | null;
  deltas: {
    systolic: number | null;
    diastolic: number | null;
    weight: number | null;
  };
  summary: string;
};

type InsightResponse = {
  insights: MedicationInsight[];
};

export async function fetchMedicationInsights() {
  const res = await apiGet<InsightResponse>('/api/medications/insights');
  return res.insights ?? [];
}
