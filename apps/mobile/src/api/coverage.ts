import { apiGet } from './http';

export type DataCoverageResponse = {
  windowDays: number;
  metrics: {
    sleepDaysWithData: number;
    stepsDaysWithData: number;
    bpReadingsThisWeek: number;
    weightReadingsThisWeek: number;
  };
  sources: {
    apple_health: { linked: boolean; lastSyncAt: string | null };
    google_fit: { linked: boolean; lastSyncAt: string | null };
    health_connect: { linked: boolean; lastSyncAt: string | null };
  };
};

export async function fetchDataCoverage() {
  return apiGet<DataCoverageResponse>('/api/data-coverage');
}
