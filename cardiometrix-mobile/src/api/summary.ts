import { apiGet } from './http';
import { SummaryResponse } from './types';

export type SummaryPeriod = 'week' | 'month';

export async function fetchSummary(period: SummaryPeriod) {
  return apiGet<SummaryResponse>(`/api/summary?period=${period}`);
}
