import test from 'node:test';
import assert from 'node:assert/strict';
import { createDailyRiskRunner } from '../src/jobs/dailyRiskCron';

test('dailyRisk runner invokes dependency and returns counts', async () => {
  let calledDate = '';
  const runner = createDailyRiskRunner({
    runAllUsers: async (dateISO) => {
      calledDate = dateISO;
      return [
        { userId: 'u1', ok: true },
        { userId: 'u2', ok: false, error: 'x' },
      ];
    },
    logger: { info: () => undefined, error: () => undefined },
  });

  const out = await runner.run('2026-02-28');
  assert.equal(calledDate, '2026-02-28');
  assert.equal(out.total, 2);
  assert.equal(out.failed, 1);
});
