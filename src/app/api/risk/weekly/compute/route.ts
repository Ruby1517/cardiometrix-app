import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { computeWeeklyRiskSummary } from '@/engines/trendRiskEngine';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json().catch(() => ({}));
  const dateParam = typeof body?.date === 'string' ? body.date : dayjs().format('YYYY-MM-DD');
  const doc = await computeWeeklyRiskSummary(uid, dateParam);
  return NextResponse.json({ ok: true, summary: doc });
}
