import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireCronAuth } from '@/lib/cronAuth';
import { runDailyScoreJob } from '@/jobs/dailyScoreJob';

const payloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const cron = requireCronAuth(req);
  if ('error' in cron) return cron.error;

  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse({
    date: body?.date || req.nextUrl.searchParams.get('date') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 422 });
  }

  const result = await runDailyScoreJob({ dateISO: parsed.data.date });
  return NextResponse.json({ ok: true, ...result });
}
