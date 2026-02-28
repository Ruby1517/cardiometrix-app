import { apiGet } from './http';
import { TrendsResponse } from './types';

export async function fetchTrends() {
  return apiGet<TrendsResponse>('/api/trends');
}
