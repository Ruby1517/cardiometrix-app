import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import DailyNudge from '@/models/DailyNudge';
import Nudge from '@/models/Nudge';
import { trackNudgeEffectiveness } from '@/engines/nudgeEngine';

const bodySchema = z.object({ status: z.enum(['completed', 'skipped', 'done', 'snoozed']) });

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 422 });
  }

  const date = dayjs().format('YYYY-MM-DD');
  const incoming = parsed.data.status;
  const dailyStatus = incoming === 'completed' ? 'done' : incoming === 'skipped' ? 'snoozed' : incoming;
  const legacyStatus = dailyStatus === 'done' ? 'completed' : 'skipped';

  const [daily, legacy] = await Promise.all([
    DailyNudge.findOneAndUpdate({ userId: uid, as_of_date: date }, { status: dailyStatus }, { new: true }),
    Nudge.findOneAndUpdate({ userId: uid, date }, { status: legacyStatus }, { new: true }),
  ]);

  if (legacy) {
    trackNudgeEffectiveness(uid, String((legacy as { _id: unknown })._id), legacyStatus).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    nudge: daily
      ? {
          id: String((daily as { _id: unknown })._id),
          message: (daily as { text?: string }).text,
          status: (daily as { status?: string }).status,
          date: (daily as { as_of_date?: string }).as_of_date,
          category: (daily as { tag?: string }).tag,
          key: (daily as { key?: string }).key,
        }
      : null,
  });
}
