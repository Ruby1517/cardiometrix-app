import { initDailyRiskCron } from '@/jobs/dailyRiskCron';
import { initReminderPushCron } from '@/jobs/reminderPushCron';

// Next.js API routes may import this to ensure background jobs are initialized once per worker.
export function initServer() {
  // Opt-in only for non-serverless/self-hosted processes.
  if (process.env.ENABLE_IN_PROCESS_CRON !== 'true') return;
  initDailyRiskCron();
  initReminderPushCron();
}
