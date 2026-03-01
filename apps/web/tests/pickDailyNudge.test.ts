import test from 'node:test';
import assert from 'node:assert/strict';
import { pickDailyNudge } from '../src/lib/nudges/pickDailyNudge';

test('pickDailyNudge maps sleep driver to sleep tag', () => {
  const picked = pickDailyNudge({
    band: 'amber',
    dateISO: '2026-02-28',
    drivers: [{ name: 'Sleep debt', contribution: 0.2 }],
  });

  assert.equal(picked.tag, 'sleep');
});
