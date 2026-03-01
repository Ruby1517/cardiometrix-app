import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Reminder from '@/models/Reminder';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const reminders = await Reminder.find({ userId: uid }).lean();
  return NextResponse.json({
    reminders: reminders.map((reminder: any) => ({
      id: String(reminder._id),
      type: reminder.type,
      time: reminder.time,
      enabled: Boolean(reminder.enabled),
      timezone: reminder.timezone || null,
      updatedAt: reminder.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const reminders = Array.isArray(body?.reminders) ? body.reminders : [];
  const timezone = body?.timezone;

  const tasks = reminders.map((reminder: any) => {
    if (!reminder?.type || !reminder?.time) return null;
    return Reminder.findOneAndUpdate(
      { userId: uid, type: reminder.type },
      {
        $set: {
          time: reminder.time,
          enabled: Boolean(reminder.enabled),
          timezone: typeof timezone === 'string' ? timezone : reminder.timezone,
        },
        $setOnInsert: { userId: uid, type: reminder.type },
      },
      { new: true, upsert: true }
    ).lean();
  });

  const saved = (await Promise.all(tasks.filter(Boolean))).filter(Boolean) as any[];
  return NextResponse.json({
    reminders: saved.map((reminder) => ({
      id: String(reminder._id),
      type: reminder.type,
      time: reminder.time,
      enabled: Boolean(reminder.enabled),
      timezone: reminder.timezone || null,
      updatedAt: reminder.updatedAt,
    })),
  });
}
