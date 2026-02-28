import cron from 'node-cron';
import dayjs from 'dayjs';
import { runDailyRiskForAllUsers } from '@/lib/riskOrchestrator';

export type DailyRiskDeps = {
  runAllUsers: (dateISO: string) => Promise<Array<{ userId: string; ok: boolean; error?: string }>>;
  logger: Pick<Console, 'info' | 'error'>;
};

export function createDailyRiskRunner(deps?: Partial<DailyRiskDeps>) {
  const resolved: DailyRiskDeps = {
    runAllUsers: deps?.runAllUsers || runDailyRiskForAllUsers,
    logger: deps?.logger || console,
  };

  async function run(dateISO = dayjs().format('YYYY-MM-DD')) {
    resolved.logger.info('[dailyRiskCron] start', { dateISO });
    const rows = await resolved.runAllUsers(dateISO);
    const failed = rows.filter((r) => !r.ok);
    resolved.logger.info('[dailyRiskCron] complete', { dateISO, total: rows.length, failed: failed.length });
    return { total: rows.length, failed: failed.length, rows };
  }

  function start(schedule = process.env.DAILY_RISK_CRON || '0 3 * * *') {
    if (!cron.validate(schedule)) {
      resolved.logger.error('[dailyRiskCron] invalid schedule', { schedule });
      return null;
    }
    return cron.schedule(schedule, () => {
      const dateISO = dayjs().format('YYYY-MM-DD');
      run(dateISO).catch((error) => {
        resolved.logger.error('[dailyRiskCron] run failed', { error: error instanceof Error ? error.message : 'unknown' });
      });
    });
  }

  return { run, start };
}

let started = false;
export function initDailyRiskCron() {
  if (started) return;
  if (process.env.DISABLE_DAILY_RISK_CRON === 'true') return;
  started = true;
  createDailyRiskRunner().start();
}
