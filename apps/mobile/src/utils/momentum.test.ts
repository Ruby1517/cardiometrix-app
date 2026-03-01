import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMomentum, computeSlope } from './momentum';

test('computeSlope returns positive slope for increasing series', () => {
  const values = [120, 125, 130, 135];
  const timestamps = [0, 1, 2, 3].map((day) => day * 24 * 60 * 60 * 1000);
  const slope = computeSlope(values, timestamps);
  assert.ok(slope > 0);
});

test('classifyMomentum returns Improving when trends decrease', () => {
  const result = classifyMomentum(-0.2, -0.1, -0.1);
  assert.equal(result.momentum, 'Improving');
  assert.ok(result.reasons.length >= 1);
});

test('classifyMomentum returns Worsening when trends rise', () => {
  const result = classifyMomentum(0.2, 0.15, 0.1);
  assert.equal(result.momentum, 'Worsening');
});

test('classifyMomentum returns Stable when trends are flat', () => {
  const result = classifyMomentum(0.0, 0.0, 0.0);
  assert.equal(result.momentum, 'Stable');
});
