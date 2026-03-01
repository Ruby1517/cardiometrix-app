import { TimelineEvent } from '../api/types';

export type TimelineGroup = {
  dateKey: string;
  title: string;
  events: TimelineEvent[];
};

export function sortTimelineEvents(events: TimelineEvent[]) {
  return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function groupTimelineEvents(events: TimelineEvent[], now = new Date()): TimelineGroup[] {
  const sorted = sortTimelineEvents(events);
  const groups: TimelineGroup[] = [];
  let currentKey = '';
  let currentGroup: TimelineGroup | null = null;

  for (const event of sorted) {
    const date = new Date(event.timestamp);
    const dateKey = toDateKey(date);
    if (!currentGroup || currentKey !== dateKey) {
      currentKey = dateKey;
      currentGroup = {
        dateKey,
        title: formatGroupTitle(date, now),
        events: [],
      };
      groups.push(currentGroup);
    }
    currentGroup.events.push(event);
  }

  return groups;
}

export function formatGroupTitle(date: Date, now = new Date()) {
  const todayKey = toDateKey(now);
  const yesterdayKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const dateKey = toDateKey(date);
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';
  const showYear = date.getFullYear() !== now.getFullYear();
  const format = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(showYear ? { year: 'numeric' } : {}),
  });
  return format.format(date);
}

export function formatEventTime(timestamp: string) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
