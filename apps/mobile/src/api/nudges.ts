import { apiGet, apiPost } from './http';
import { NudgeResponse } from './types';

export async function fetchTodayNudge() {
  const res = await apiGet<NudgeResponse>('/api/nudges/today');
  return res.nudge ?? null;
}

export async function markTodayNudgeDone() {
  return apiPost<{ ok: boolean; nudge: NudgeResponse['nudge'] }>('/api/nudges/done');
}
