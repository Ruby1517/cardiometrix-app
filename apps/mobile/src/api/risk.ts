import { apiGet } from './http';
import { RiskTodayResponse, WeeklyRiskSummaryResponse } from './types';

export async function getWeeklyRiskSummary() {
  const data = await apiGet<WeeklyRiskSummaryResponse>('/api/risk/weekly');
  return data.summary;
}

export async function fetchTodayRisk() {
  const data = await apiGet<RiskTodayResponse>('/api/risk/today');
  return data.today;
}
