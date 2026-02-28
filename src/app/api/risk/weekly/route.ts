import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import WeeklyRiskSummary from '@/models/WeeklyRiskSummary';
import { computeWeeklyRiskSummary } from '@/engines/trendRiskEngine';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const dateParam = req.nextUrl.searchParams.get('date') || dayjs().format('YYYY-MM-DD');
  const weekStart = dayjs(dateParam).startOf('week').format('YYYY-MM-DD');

  const existing = await WeeklyRiskSummary.findOne({ userId: uid, weekStart }).lean();
  if (existing) return NextResponse.json({ summary: existing });

  const doc = await computeWeeklyRiskSummary(uid, dateParam);
  return NextResponse.json({ summary: doc });
}
