import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 100);

  const rows = await Measurement.find({
    userId: uid,
    type: { $in: ['bp', 'weight'] },
  })
    .sort({ measuredAt: -1 })
    .limit(limit)
    .lean();

  const entries = rows.map((row: any) => ({
    id: String(row._id),
    type: row.type,
    measuredAt: row.measuredAt,
    systolic: row.payload?.systolic,
    diastolic: row.payload?.diastolic,
    pulse: row.payload?.pulse,
    weight: row.payload?.kg,
  }));

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const measuredAt = body?.measuredAt ? new Date(body.measuredAt) : new Date();

  const docs = [];

  if (body?.systolic && body?.diastolic) {
    docs.push(
      Measurement.create({
        userId: uid,
        type: 'bp',
        measuredAt,
        source: 'manual',
        payload: {
          systolic: Number(body.systolic),
          diastolic: Number(body.diastolic),
          pulse: body?.pulse ? Number(body.pulse) : undefined,
        },
      })
    );
  }

  if (body?.weight) {
    docs.push(
      Measurement.create({
        userId: uid,
        type: 'weight',
        measuredAt,
        source: 'manual',
        payload: { kg: Number(body.weight) },
      })
    );
  }

  await Promise.all(docs);

  return NextResponse.json({ ok: true, count: docs.length });
}
