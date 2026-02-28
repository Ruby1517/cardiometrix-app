import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import DailyNudge from '@/models/DailyNudge';
import { initServer } from '@/index';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function GET(req: NextRequest) {
  initServer();
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const parsed = querySchema.safeParse({ date: req.nextUrl.searchParams.get('date') || undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 422 });
  }

  const date = parsed.data.date || dayjs().format('YYYY-MM-DD');
  const nudge = await DailyNudge.findOne({ userId: uid, as_of_date: date }).lean();

  if (!nudge) {
    return NextResponse.json({ nudge: null });
  }

  return NextResponse.json({
    nudge: {
      id: String((nudge as { _id: unknown })._id),
      message: (nudge as { text?: string }).text,
      status: (nudge as { status?: string }).status,
      date: (nudge as { as_of_date?: string }).as_of_date,
      category: (nudge as { tag?: string }).tag,
      key: (nudge as { key?: string }).key,
    },
  });
}
