import test from 'node:test';
import assert from 'node:assert/strict';
import { runDailyScoreJob } from '../src/jobs/dailyScoreJob';

test('runDailyScoreJob computes as_of_date using user timezone', async () => {
  const calls: Array<{ userId: string; asOfDate: string }> = [];

  const result = await runDailyScoreJob({
    now: new Date('2026-03-01T01:00:00.000Z'),
    deps: {
      fetchUsers: async () => [{ _id: 'u_utc' }, { _id: 'u_pt' }],
      fetchSettings: async () => [
        { userId: 'u_utc', timezone: 'UTC' },
        { userId: 'u_pt', timezone: 'America/Los_Angeles' },
      ],
      computeOne: async (userId, asOfDate) => {
        calls.push({ userId, asOfDate });
      },
      logger: { info: () => undefined, error: () => undefined },
    },
  });

  assert.equal(result.total, 2);
  assert.equal(result.failed, 0);
  assert.equal(calls.find((c) => c.userId === 'u_utc')?.asOfDate, '2026-03-01');
  assert.equal(calls.find((c) => c.userId === 'u_pt')?.asOfDate, '2026-02-28');
});
