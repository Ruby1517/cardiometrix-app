import { apiGet } from './http';

export type DataQuality = {
  score: number;
  breakdown: {
    vitals: number;
    symptoms: number;
    meds: number;
  };
  days: {
    vitals: number;
    symptoms: number;
    meds: number;
  };
  windowDays: number;
  summary: string;
};

type QualityResponse = {
  quality: DataQuality;
};

export async function fetchDataQuality() {
  const res = await apiGet<QualityResponse>('/api/quality?window=7');
  return res.quality;
}
