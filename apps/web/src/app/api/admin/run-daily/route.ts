import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import { runDailyScoreJob } from '@/jobs/dailyScoreJob';

const payloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function isAdminKeyAuthorized(req: NextRequest) {
  const configured = process.env.ADMIN_KEY;
  if (!configured) return false;

  const header = req.headers.get('x-admin-key');
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  const bearer = auth && auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  return header === configured || bearer === configured;
}

export async function POST(req: NextRequest) {
  await dbConnect();

  if (!isAdminKeyAuthorized(req)) {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const forbidden = requireRole(auth.claims!, ['admin']);
    if (forbidden) return forbidden;
  }

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
