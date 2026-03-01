import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import UserSettings from '@/models/UserSettings';
import { DEFAULT_NOTIFY_TIME, DEFAULT_TIMEZONE, normalizeUserTimezone } from '@/lib/userSettings';

const bodySchema = z.object({
  notifyEnabled: z.boolean(),
  notifyTimeLocal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  timezone: z.string().min(1),
});

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { uid } = auth.claims!;
  const settings = await UserSettings.findOne({ userId: uid }).lean();
  return NextResponse.json({
    settings: {
      timezone: (settings as { timezone?: string })?.timezone || DEFAULT_TIMEZONE,
      notifyTimeLocal: (settings as { notifyTimeLocal?: string })?.notifyTimeLocal || DEFAULT_NOTIFY_TIME,
      notifyEnabled: Boolean((settings as { notifyEnabled?: boolean })?.notifyEnabled ?? true),
      pushTokenCount: ((settings as { pushTokens?: string[] })?.pushTokens || []).length,
    },
  });
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
  }

  const { uid } = auth.claims!;
  const timezone = normalizeUserTimezone(parsed.data.timezone);

  const settings = await UserSettings.findOneAndUpdate(
    { userId: uid },
    {
      $set: {
        timezone,
        notifyTimeLocal: parsed.data.notifyTimeLocal,
        notifyEnabled: parsed.data.notifyEnabled,
      },
      $setOnInsert: {
        userId: uid,
        pushTokens: [],
      },
    },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json({
    ok: true,
    settings: {
      timezone: (settings as { timezone?: string })?.timezone || timezone,
      notifyTimeLocal: (settings as { notifyTimeLocal?: string })?.notifyTimeLocal || parsed.data.notifyTimeLocal,
      notifyEnabled: Boolean((settings as { notifyEnabled?: boolean })?.notifyEnabled),
      pushTokenCount: ((settings as { pushTokens?: string[] })?.pushTokens || []).length,
    },
  });
}
