import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import dayjs from 'dayjs';
import { upsertDailyNudge } from '@/engines/nudgeEngine';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;
  const today = dayjs().format('YYYY-MM-DD');
  const nudge = await upsertDailyNudge(uid, today);
  return NextResponse.json({ nudge });
}
