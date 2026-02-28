import { apiGet } from './http';
import { WeeklyRiskSummaryResponse } from './types';

export async function getWeeklyRiskSummary() {
  const data = await apiGet<WeeklyRiskSummaryResponse>('/api/risk/weekly');
  return data.summary;
}
