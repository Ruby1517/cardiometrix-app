import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Device from '@/models/Device';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const device = await Device.findOne({ userId: uid, status: 'active', expoPushToken: { $exists: true, $ne: null } })
    .sort({ updatedAt: -1 })
    .lean();

  if (!device || !(device as any).expoPushToken) {
    return NextResponse.json({ error: 'No Expo push token registered' }, { status: 404 });
  }

  const message = {
    to: (device as any).expoPushToken,
    sound: 'default',
    title: 'CardioMetrix',
    body: 'Test notification from development build.',
    data: { type: 'test' },
  };

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const json = await res.json();
  return NextResponse.json({ ok: true, response: json });
}
