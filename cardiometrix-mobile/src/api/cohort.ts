import { apiGet } from './http';

export type CohortComparison = {
  cohortLabel: string;
  benchmarks: {
    systolic: number;
    diastolic: number;
    bmiMin: number;
    bmiMax: number;
  };
  user: {
    systolic: number | null;
    diastolic: number | null;
    bmi: number | null;
  };
  summary: string;
  note: string;
};

type CohortResponse = {
  comparison: CohortComparison | null;
};

export async function fetchCohortComparison() {
  const res = await apiGet<CohortResponse>('/api/cohort/compare');
  return res.comparison ?? null;
}
