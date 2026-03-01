import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import SymptomCheckin from '@/models/SymptomCheckin';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 50);

  const rows = await SymptomCheckin.find({ userId: uid })
    .sort({ checkedAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    entries: rows.map((row: any) => ({
      id: String(row._id),
      checkedAt: row.checkedAt,
      severity: row.severity,
      symptoms: row.symptoms,
      notes: row.notes,
    })),
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const checkedAt = body?.checkedAt ? new Date(body.checkedAt) : new Date();

  const doc = await SymptomCheckin.create({
    userId: uid,
    checkedAt,
    severity: Number(body?.severity || 1),
    symptoms: {
      headache: Boolean(body?.symptoms?.headache),
      dizziness: Boolean(body?.symptoms?.dizziness),
      fatigue: Boolean(body?.symptoms?.fatigue),
      chestDiscomfort: Boolean(body?.symptoms?.chestDiscomfort),
      shortnessOfBreath: Boolean(body?.symptoms?.shortnessOfBreath),
      swelling: Boolean(body?.symptoms?.swelling),
      otherText: body?.symptoms?.otherText || '',
    },
    notes: body?.notes || '',
  });

  return NextResponse.json({ id: doc._id });
}
