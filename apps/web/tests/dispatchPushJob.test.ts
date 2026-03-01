import test from 'node:test';
import assert from 'node:assert/strict';
import { runDispatchPushJob } from '../src/jobs/dispatchPushJob';

test('runDispatchPushJob sends due notifications and marks notified date', async () => {
  const updates: Array<{ id: string; localDate: string; invalidTokens: string[] }> = [];
  const sentBatches: number[] = [];

  const out = await runDispatchPushJob({
    now: new Date('2026-03-01T09:02:00.000Z'),
    windowMinutes: 5,
    deps: {
      fetchSettings: async () => [
        {
          _id: 's1',
          userId: 'u1',
          timezone: 'UTC',
          notifyTimeLocal: '09:00',
          notifyEnabled: true,
          pushTokens: ['ExponentPushToken[test]'],
          lastNotifiedDate: '2026-02-28',
        },
      ],
      fetchTodayRisk: async () => [{ userId: 'u1', as_of_date: '2026-03-01', band: 'amber' }],
      fetchTodayNudges: async () => [{ userId: 'u1', as_of_date: '2026-03-01', text: 'Take a short walk.' }],
      sendBatch: async (messages) => {
        sentBatches.push(messages.length);
        return messages.map(() => ({ status: 'ok', id: 'ticket-ok' }));
      },
      updateSettings: async (id, update) => {
        updates.push({ id: String(id), localDate: update.localDate, invalidTokens: update.invalidTokens });
      },
      logger: { info: () => undefined, error: () => undefined },
    },
  });

  assert.equal(out.due, 1);
  assert.equal(out.sentUsers, 1);
  assert.equal(out.sentMessages, 1);
  assert.deepEqual(sentBatches, [1]);
  assert.deepEqual(updates, [{ id: 's1', localDate: '2026-03-01', invalidTokens: [] }]);
});

test('runDispatchPushJob does not double-send when already notified today', async () => {
  let sendCalled = false;

  const out = await runDispatchPushJob({
    now: new Date('2026-03-01T09:02:00.000Z'),
    windowMinutes: 5,
    deps: {
      fetchSettings: async () => [
        {
          _id: 's2',
          userId: 'u2',
          timezone: 'UTC',
          notifyTimeLocal: '09:00',
          notifyEnabled: true,
          pushTokens: ['ExponentPushToken[test]'],
          lastNotifiedDate: '2026-03-01',
        },
      ],
      fetchTodayRisk: async () => [],
      fetchTodayNudges: async () => [],
      sendBatch: async () => {
        sendCalled = true;
        return [];
      },
      updateSettings: async () => undefined,
      logger: { info: () => undefined, error: () => undefined },
    },
  });

  assert.equal(out.due, 0);
  assert.equal(out.sentUsers, 0);
  assert.equal(sendCalled, false);
});
