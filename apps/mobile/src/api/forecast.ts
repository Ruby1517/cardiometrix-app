import { apiGet } from './http';

type ForecastPoint = {
  days: number;
  score: number;
  band: 'green' | 'amber' | 'red';
};

export type RiskForecast = {
  asOf: string;
  currentScore: number;
  currentBand: 'green' | 'amber' | 'red';
  slopePerDay: number;
  confidence: 'low' | 'medium' | 'high';
  horizons: ForecastPoint[];
  explanation: string;
};

type ForecastResponse = {
  forecast: RiskForecast | null;
};

export async function fetchRiskForecast() {
  const res = await apiGet<ForecastResponse>('/api/risk/forecast?horizons=30,60,90');
  return res.forecast ?? null;
}
