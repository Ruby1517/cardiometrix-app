import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import MedicationAdherence from '@/models/MedicationAdherence';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const medicationId = body?.medicationId;
  const status = body?.status;
  if (!medicationId || !['taken', 'missed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const date = body?.date || dayjs().format('YYYY-MM-DD');

  await MedicationAdherence.findOneAndUpdate(
    { userId: uid, medicationId, date },
    { userId: uid, medicationId, date, status },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}
