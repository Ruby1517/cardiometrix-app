import { apiGet, apiPost } from './http';
import { Goal } from './types';

type GoalResponse = {
  goal: Goal | null;
};

export async function fetchGoals(): Promise<Goal | null> {
  const res = await apiGet<GoalResponse>('/api/goals');
  return res.goal ?? null;
}

export async function saveGoals(input: {
  bpSystolicTarget?: number;
  bpDiastolicTarget?: number;
  weightTargetKg?: number;
}) {
  const res = await apiPost<GoalResponse>('/api/goals', input);
  return res.goal ?? null;
}
