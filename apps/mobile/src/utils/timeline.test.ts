import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTimelineEvents, sortTimelineEvents } from './timeline';

function makeEvent(id: string, date: Date) {
  return {
    id,
    type: 'vital' as const,
    timestamp: date.toISOString(),
    title: 'Blood pressure',
    summary: '120/80 mmHg',
    data: {},
  };
}

test('sortTimelineEvents orders by newest first', () => {
  const older = makeEvent('1', new Date(2025, 0, 8, 9, 0));
  const newest = makeEvent('2', new Date(2025, 0, 9, 10, 0));
  const result = sortTimelineEvents([older, newest]);
  assert.equal(result[0].id, '2');
  assert.equal(result[1].id, '1');
});

test('groupTimelineEvents groups by date with Today/Yesterday labels', () => {
  const now = new Date(2025, 0, 10, 12, 0);
  const today = makeEvent('1', new Date(2025, 0, 10, 9, 0));
  const yesterday = makeEvent('2', new Date(2025, 0, 9, 18, 0));
  const result = groupTimelineEvents([yesterday, today], now);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'Today');
  assert.equal(result[1].title, 'Yesterday');
});

test('groupTimelineEvents keeps events in descending order inside groups', () => {
  const now = new Date(2025, 0, 10, 12, 0);
  const early = makeEvent('1', new Date(2025, 0, 8, 8, 0));
  const late = makeEvent('2', new Date(2025, 0, 8, 20, 0));
  const result = groupTimelineEvents([early, late], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].events[0].id, '2');
  assert.equal(result[0].events[1].id, '1');
});
