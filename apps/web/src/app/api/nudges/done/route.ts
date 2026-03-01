import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import DailyNudge from '@/models/DailyNudge';
import Nudge from '@/models/Nudge';
import UserSettings from '@/models/UserSettings';
import { dateISOInTimezone, resolveTimezone } from '@/lib/time';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { uid } = auth.claims!;
  const settings = (await UserSettings.findOne({ userId: uid }).select('timezone').lean()) as { timezone?: string } | null;
  const timezone = resolveTimezone(settings?.timezone || 'America/Los_Angeles');
  const date = dateISOInTimezone(timezone);

  const [daily] = await Promise.all([
    DailyNudge.findOneAndUpdate({ userId: uid, as_of_date: date }, { status: 'done' }, { new: true }),
    Nudge.findOneAndUpdate({ userId: uid, date }, { status: 'completed' }, { new: true }),
  ]);

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
