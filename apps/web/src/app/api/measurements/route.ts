import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';

const LAB_TYPES = ['a1c', 'lipid'] as const;
type LabType = (typeof LAB_TYPES)[number];

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 50);
  const typesParam = searchParams.get('types');
  const types = (typesParam ? typesParam.split(',') : LAB_TYPES)
    .map((value) => value.trim())
    .filter((value): value is LabType => LAB_TYPES.includes(value as LabType));

  const rows = await Measurement.find({
    userId: uid,
    type: { $in: types },
  })
    .sort({ measuredAt: -1 })
    .limit(limit)
    .lean();

  const entries = rows.map((row: any) => ({
    id: String(row._id),
    type: row.type,
    measuredAt: row.measuredAt,
    payload: row.payload ?? {},
  }));

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const type = body?.type as LabType | undefined;
  if (!type || !LAB_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid measurement type.' }, { status: 400 });
  }

  const measuredAt = body?.measuredAt ? new Date(body.measuredAt) : new Date();
  const payloadSource = body?.payload ?? body ?? {};

  let payload: Record<string, number> | null = null;

  if (type === 'a1c') {
    const percent = Number(payloadSource.percent);
    if (!Number.isFinite(percent)) {
      return NextResponse.json({ error: 'A1c percent is required.' }, { status: 400 });
    }
    payload = { percent };
  }

  if (type === 'lipid') {
    const total = Number(payloadSource.total);
    if (!Number.isFinite(total)) {
      return NextResponse.json({ error: 'Lipid total is required.' }, { status: 400 });
    }
    payload = {
      total,
      ...(Number.isFinite(Number(payloadSource.ldl)) ? { ldl: Number(payloadSource.ldl) } : {}),
      ...(Number.isFinite(Number(payloadSource.hdl)) ? { hdl: Number(payloadSource.hdl) } : {}),
      ...(Number.isFinite(Number(payloadSource.triglycerides))
        ? { triglycerides: Number(payloadSource.triglycerides) }
        : {}),
    };
  }

  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const doc = await Measurement.create({
    userId: uid,
    type,
    measuredAt,
    source: 'manual',
    payload,
  });

  return NextResponse.json({ ok: true, id: String(doc._id) });
}
