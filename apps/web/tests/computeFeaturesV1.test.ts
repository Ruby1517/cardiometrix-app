import test from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import { deriveFeaturesFromRecords } from '../src/lib/featureEngineering/computeFeaturesV1';

function makeBp(asOf: string, dayOffset: number, sys: number, dia: number) {
  return {
    type: 'bp',
    measuredAt: dayjs(asOf).subtract(dayOffset, 'day').toDate(),
    payload: { systolic: sys, diastolic: dia },
  };
}

test('deriveFeaturesFromRecords computes deterministic trend and variance', () => {
  const asOfDate = '2026-02-28';
  const measurements = [
    makeBp(asOfDate, 6, 120, 78),
    makeBp(asOfDate, 4, 124, 80),
    makeBp(asOfDate, 2, 128, 82),
    { type: 'weight', measuredAt: dayjs(asOfDate).subtract(13, 'day').toDate(), payload: { kg: 80 } },
    { type: 'weight', measuredAt: dayjs(asOfDate).toDate(), payload: { kg: 81.3 } },
    { type: 'steps', measuredAt: dayjs(asOfDate).subtract(1, 'day').toDate(), payload: { count: 6500 } },
    { type: 'sleep', measuredAt: dayjs(asOfDate).toDate(), payload: { minutes: 360 } },
  ];

  const out = deriveFeaturesFromRecords({
    userId: 'u1',
    asOfDate,
    measurements,
    nudgeStatuses7d: ['done', 'pending', 'snoozed'],
  });

  assert.equal(out.features.as_of_date, asOfDate);
  assert.ok(out.features.bp_sys_trend_14d > 0);
  assert.ok(out.features.bp_sys_var_7d > 0);
  assert.ok(out.features.weight_trend_14d > 0);
  assert.ok(out.features.adherence_nudge_7d > 0 && out.features.adherence_nudge_7d < 1);
  assert.equal(typeof out.sufficientData, 'boolean');
});
