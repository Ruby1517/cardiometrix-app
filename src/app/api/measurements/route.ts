import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Measurement from '@/models/Measurement';
import { zMeasurement } from '@/lib/z';
import { requireAuth } from '@/middleware/requireAuth';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = requireAuth(req); if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;
  const data = zMeasurement.parse(await req.json());
  const doc = await Measurement.create({ userId: uid, type: data.type, measuredAt: new Date(data.measuredAt), source: data.source, payload: data.payload });
  return NextResponse.json({ id: doc._id });
}


export async function GET(req: NextRequest) {
await dbConnect();
const auth = requireAuth(req); if ('error' in auth) return auth.error;
const { uid } = auth.claims!;
const { searchParams } = new URL(req.url);
const type = searchParams.get('type') || undefined;
const limit = Number(searchParams.get('limit') || 50);
const q: any = { userId: uid };
if (type) q.type = type;
const rows = await Measurement.find(q).sort({ measuredAt: -1 }).limit(limit).lean();
return NextResponse.json({ rows });
}