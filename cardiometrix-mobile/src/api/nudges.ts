import { apiGet, apiPost } from './http';
import { NudgeResponse } from './types';

export async function fetchTodayNudge() {
  try {
    await apiPost('/api/nudges/compute');
  } catch {
    // If compute fails, still attempt to load the most recent nudge.
  }
  const res = await apiGet<NudgeResponse>('/api/nudges/today');
  return res.nudge ?? null;
}
