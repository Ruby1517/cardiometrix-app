import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import DailyNudge from '@/models/DailyNudge';
import UserSettings from '@/models/UserSettings';
import { dateISOInTimezone, resolveTimezone } from '@/lib/time';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const parsed = querySchema.safeParse({ date: req.nextUrl.searchParams.get('date') || undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 422 });
  }

  const settings = (await UserSettings.findOne({ userId: uid }).select('timezone').lean()) as { timezone?: string } | null;
  const timezone = resolveTimezone(settings?.timezone || 'America/Los_Angeles');
  const date = parsed.data.date || dateISOInTimezone(timezone);
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
      burden: (nudge as { burden?: number }).burden ?? 2,
    },
  });
}
