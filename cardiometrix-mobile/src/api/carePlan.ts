import { apiGet } from './http';

export type CarePlanAction = {
  title: string;
  detail: string;
  metric: string;
  target: string;
};

export type CarePlan = {
  weekStart: string;
  weekEnd: string;
  summary: string;
  focusAreas: string[];
  actions: CarePlanAction[];
};

type CarePlanResponse = {
  plan: CarePlan | null;
};

export async function fetchCarePlan() {
  const res = await apiGet<CarePlanResponse>('/api/care-plan');
  return res.plan ?? null;
}
