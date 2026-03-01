import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireCronAuth } from '@/lib/cronAuth';
import { runDispatchPushJob } from '@/jobs/dispatchPushJob';

const payloadSchema = z.object({
  windowMinutes: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: NextRequest) {
  const cron = requireCronAuth(req);
  if ('error' in cron) return cron.error;

  await dbConnect();

  const body = await req.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse({
    windowMinutes: typeof body?.windowMinutes === 'number'
      ? body.windowMinutes
      : req.nextUrl.searchParams.get('windowMinutes')
        ? Number(req.nextUrl.searchParams.get('windowMinutes'))
        : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
  }

  const result = await runDispatchPushJob({ windowMinutes: parsed.data.windowMinutes || 5 });
  return NextResponse.json({ ok: true, ...result });
}
