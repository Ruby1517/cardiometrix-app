import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchDueReminderPushes } from '../src/jobs/reminderPushCron';

test('dispatchDueReminderPushes sends when reminder is due and device exists', async () => {
  const calls: Array<{ reminderId: string; localDate: string }> = [];
  const pushed: Array<Array<{ to: string; title: string; body: string }>> = [];

  const out = await dispatchDueReminderPushes(new Date('2026-03-01T09:15:00.000Z'), {
    fetchReminders: async () => [
      {
        _id: 'r1',
        userId: 'u1',
        type: 'vitals',
        time: '09:15',
        enabled: true,
        timezone: 'UTC',
        lastSentLocalDate: '2026-02-28',
      },
    ],
    fetchActiveDevices: async () => [{ userId: 'u1', expoPushToken: 'ExponentPushToken[test]' }],
    fetchDailyNudges: async () => [{ userId: 'u1', as_of_date: '2026-03-01', text: 'Take a 10-minute walk.' }],
    sendExpo: async (messages) => {
      pushed.push(messages.map((m) => ({ to: m.to, title: m.title, body: m.body })));
    },
    markReminderSent: async (reminderId, localDate) => {
      calls.push({ reminderId: String(reminderId), localDate });
    },
    logger: { info: () => undefined, error: () => undefined },
  });

  assert.equal(out.scanned, 1);
  assert.equal(out.due, 1);
  assert.equal(out.sent, 1);
  assert.equal(out.failed, 0);
  assert.equal(out.skippedNoDevice, 0);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0][0].to, 'ExponentPushToken[test]');
  assert.equal(pushed[0][0].body, 'Take a 10-minute walk.');
  assert.deepEqual(calls, [{ reminderId: 'r1', localDate: '2026-03-01' }]);
});

test('dispatchDueReminderPushes skips when no active device exists', async () => {
  const out = await dispatchDueReminderPushes(new Date('2026-03-01T09:15:00.000Z'), {
    fetchReminders: async () => [
      {
        _id: 'r2',
        userId: 'u2',
        type: 'meds',
        time: '09:15',
        enabled: true,
        timezone: 'UTC',
      },
    ],
    fetchActiveDevices: async () => [],
    fetchDailyNudges: async () => [],
    sendExpo: async () => {
      throw new Error('should not send');
    },
    markReminderSent: async () => {
      throw new Error('should not mark');
    },
    logger: { info: () => undefined, error: () => undefined },
  });

  assert.equal(out.scanned, 1);
  assert.equal(out.due, 1);
  assert.equal(out.sent, 0);
  assert.equal(out.skippedNoDevice, 1);
  assert.equal(out.failed, 0);
});
