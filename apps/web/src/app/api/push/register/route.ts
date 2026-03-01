import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import UserSettings from '@/models/UserSettings';
import { normalizeUserTimezone } from '@/lib/userSettings';

const bodySchema = z.object({
  expoPushToken: z.string().min(8),
  timezone: z.string().min(1).optional(),
  notifyTimeLocal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
  }

  const { uid } = auth.claims!;
  const payload = parsed.data;
  const timezone = normalizeUserTimezone(payload.timezone);

  const settings = await UserSettings.findOneAndUpdate(
    { userId: uid },
    {
      $set: {
        ...(payload.timezone ? { timezone } : {}),
        ...(payload.notifyTimeLocal ? { notifyTimeLocal: payload.notifyTimeLocal } : {}),
      },
      $setOnInsert: {
        userId: uid,
        notifyEnabled: true,
        timezone,
        notifyTimeLocal: payload.notifyTimeLocal || '09:00',
      },
      $addToSet: { pushTokens: payload.expoPushToken },
    },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json({
    ok: true,
    settings: {
      timezone: (settings as { timezone?: string })?.timezone || timezone,
      notifyTimeLocal: (settings as { notifyTimeLocal?: string })?.notifyTimeLocal || payload.notifyTimeLocal || '09:00',
      notifyEnabled: Boolean((settings as { notifyEnabled?: boolean })?.notifyEnabled ?? true),
      pushTokenCount: ((settings as { pushTokens?: string[] })?.pushTokens || []).length,
    },
  });
}
