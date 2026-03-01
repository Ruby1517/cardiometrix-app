import { apiGet } from './http';
import { TimelineEvent } from './types';

export type TimelineRange = '7d' | '30d' | '90d';

type TimelineResponse = {
  events: TimelineEvent[];
};

export async function fetchTimeline(range: TimelineRange) {
  const res = await apiGet<TimelineResponse>(`/api/timeline?range=${range}`);
  return res.events ?? [];
}
