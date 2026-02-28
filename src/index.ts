import { initDailyRiskCron } from '@/jobs/dailyRiskCron';

// Next.js API routes may import this to ensure background jobs are initialized once per worker.
export function initServer() {
  initDailyRiskCron();
}
