import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummaryNarrative, computeSummaryStats } from './summaryEngine';

test('buildSummaryNarrative handles missing data', () => {
  const stats = computeSummaryStats(
    { bpReadings: [], weightReadings: [], symptoms: [], adherenceLogs: [] },
    'week',
  );
  const narrative = buildSummaryNarrative(stats);
  assert.match(narrative, /add blood pressure/i);
  assert.match(narrative, /add weight/i);
});

test('buildSummaryNarrative includes positive and watch sentences', () => {
  const stats = computeSummaryStats(
    {
      bpReadings: [
        { systolic: 120, diastolic: 78, pulse: 70, measuredAt: new Date('2025-01-01') },
        { systolic: 121, diastolic: 79, pulse: 72, measuredAt: new Date('2025-01-06') },
      ],
      weightReadings: [
        { kg: 72, measuredAt: new Date('2025-01-01') },
        { kg: 73, measuredAt: new Date('2025-01-06') },
      ],
      symptoms: [],
      adherenceLogs: [{ status: 'taken', date: '2025-01-02' }],
    },
    'week',
  );
  const narrative = buildSummaryNarrative(stats);
  assert.match(narrative, /medication check-ins were consistent/i);
  assert.match(narrative, /weight trended upward/i);
});

test('buildSummaryNarrative suggests symptom logging when symptoms present', () => {
  const stats = computeSummaryStats(
    {
      bpReadings: [],
      weightReadings: [],
      symptoms: [
        { checkedAt: new Date('2025-01-02'), symptoms: { headache: true } },
        { checkedAt: new Date('2025-01-03'), symptoms: { headache: true } },
      ],
      adherenceLogs: [],
    },
    'week',
  );
  const narrative = buildSummaryNarrative(stats);
  assert.match(narrative, /symptoms were noted/i);
  assert.match(narrative, /keep noting symptoms/i);
});
