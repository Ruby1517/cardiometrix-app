import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import { createReminderPushRunner } from '@/jobs/reminderPushCron';
import { initServer } from '@/index';

export async function POST(req: NextRequest) {
  initServer();
  await dbConnect();

  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const forbidden = requireRole(auth.claims!, ['admin']);
  if (forbidden) return forbidden;

  const runner = createReminderPushRunner();
  const out = await runner.run(new Date());
  return NextResponse.json({ ok: true, ...out });
}
