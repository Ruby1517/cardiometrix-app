import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Device from '@/models/Device';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const token = body?.expoPushToken;
  if (!token) return NextResponse.json({ error: 'Missing expoPushToken' }, { status: 400 });

  const doc = await Device.findOneAndUpdate(
    { userId: uid, expoPushToken: token },
    {
      userId: uid,
      provider: 'expo',
      expoPushToken: token,
      platform: body?.platform,
      model: body?.model,
      status: 'active',
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, id: doc._id });
}
