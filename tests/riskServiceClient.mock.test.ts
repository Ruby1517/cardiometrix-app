import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreOne, scoreBatch } from '../src/lib/riskServiceClient';
import type { FeaturesV1 } from '../src/lib/featureEngineering/featuresV1';

const sample: FeaturesV1 = {
  user_id: 'u1',
  as_of_date: '2026-02-28',
  bp_sys_trend_14d: 1,
  bp_sys_var_7d: 4,
  bp_dia_trend_14d: 0.5,
  bp_dia_var_7d: 3,
  hrv_z_7d: -0.6,
  rhr_z_7d: 0.3,
  steps_z_7d: -0.8,
  sleep_debt_hours_7d: 1.2,
  weight_trend_14d: 0.1,
  glucose_trend_14d: 2,
  a1c_latest: null,
  ldl_latest: null,
  adherence_nudge_7d: 0.5,
};

test('scoreOne sends FeaturesV1 payload shape', async () => {
  const oldFetch = global.fetch;
  let capturedBody: Record<string, unknown> = {};

  global.fetch = (async (_url: string, init?: RequestInit) => {
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return new Response(
      JSON.stringify({
        risk: 0.4,
        band: 'amber',
        drivers: [{ name: 'Sleep debt', value: 1.2, direction: 'up', contribution: 0.08 }],
        model_version: 'rule-v0',
        as_of_date: '2026-02-28',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof global.fetch;

  try {
    const out = await scoreOne(sample);
    assert.equal(out.band, 'amber');
    assert.equal(capturedBody.as_of_date, '2026-02-28');
    assert.equal(typeof capturedBody.bp_sys_trend_14d, 'number');
  } finally {
    global.fetch = oldFetch;
  }
});

test('scoreBatch returns same item count', async () => {
  const oldFetch = global.fetch;

  global.fetch = (async () => {
    return new Response(
      JSON.stringify({
        items: [
          {
            risk: 0.2,
            band: 'green',
            drivers: [{ name: 'steps', value: -0.5, direction: 'up', contribution: 0.02 }],
            model_version: 'rule-v0',
            as_of_date: '2026-02-28',
          },
          {
            risk: 0.7,
            band: 'red',
            drivers: [{ name: 'bp', value: 2.1, direction: 'up', contribution: 0.12 }],
            model_version: 'rule-v0',
            as_of_date: '2026-02-28',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof global.fetch;

  try {
    const out = await scoreBatch([sample, sample]);
    assert.equal(out.length, 2);
  } finally {
    global.fetch = oldFetch;
  }
});
