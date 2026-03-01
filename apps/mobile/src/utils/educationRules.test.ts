import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEducationRules } from './educationRules';

test('selectEducationRules returns BP trend rule when trend is up', () => {
  const rules = selectEducationRules({ bpTrend: 'up' });
  const ids = rules.map((rule) => rule.id);
  assert.ok(ids.includes('bp-trend-up'));
});

test('selectEducationRules returns HbA1c rule when present', () => {
  const rules = selectEducationRules({ hasA1c: true });
  const ids = rules.map((rule) => rule.id);
  assert.ok(ids.includes('a1c-info'));
});

test('selectEducationRules returns no rules when nothing applies', () => {
  const rules = selectEducationRules({ bpTrend: 'down', hasA1c: false });
  assert.equal(rules.length, 0);
});
