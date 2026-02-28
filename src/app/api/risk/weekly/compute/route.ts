import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { computeAndStoreDailyRiskAndNudge } from '@/lib/riskOrchestrator';
import { initServer } from '@/index';

const bodySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function POST(req: NextRequest) {
  initServer();
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 422 });
  }

  const endDate = parsed.data.date || dayjs().format('YYYY-MM-DD');
  const dates = Array.from({ length: 7 }).map((_, idx) => dayjs(endDate).subtract(6 - idx, 'day').format('YYYY-MM-DD'));

  for (const date of dates) {
    await computeAndStoreDailyRiskAndNudge(uid, date);
  }

  return NextResponse.json({ ok: true, dates });
}
