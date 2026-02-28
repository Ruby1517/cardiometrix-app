import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import { createDailyRiskRunner } from '@/jobs/dailyRiskCron';
import { initServer } from '@/index';

const bodySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function POST(req: NextRequest) {
  initServer();
  await dbConnect();

  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const forbidden = requireRole(auth.claims!, ['admin']);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse({
    date: body?.date || req.nextUrl.searchParams.get('date') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 422 });
  }

  const date = parsed.data.date || dayjs().format('YYYY-MM-DD');
  const runner = createDailyRiskRunner();
  const result = await runner.run(date);
  return NextResponse.json({ ok: true, date, ...result });
}
