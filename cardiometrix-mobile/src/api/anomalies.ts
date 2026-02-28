import { apiGet } from './http';

export type Anomaly = {
  type: 'bp' | 'weight';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  date: string;
};

type AnomalyResponse = {
  anomalies: Anomaly[];
};

export async function fetchAnomalies() {
  const res = await apiGet<AnomalyResponse>('/api/anomalies');
  return res.anomalies ?? [];
}
