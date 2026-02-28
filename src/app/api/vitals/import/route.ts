import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';

type ImportEntry = {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  weight?: number;
  measuredAt?: string;
  source?: string;
};

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const entries = Array.isArray(body?.entries) ? (body.entries as ImportEntry[]) : [];
  if (!entries.length) {
    return NextResponse.json({ error: 'Missing entries.' }, { status: 400 });
  }

  const tasks = entries.flatMap((entry) => {
    const measuredAt = entry.measuredAt ? new Date(entry.measuredAt) : new Date();
    const source = entry.source || 'import';
    const docs = [];
    if (entry.systolic && entry.diastolic) {
      docs.push(
        Measurement.create({
          userId: uid,
          type: 'bp',
          measuredAt,
          source,
          payload: {
            systolic: Number(entry.systolic),
            diastolic: Number(entry.diastolic),
            pulse: entry.pulse ? Number(entry.pulse) : undefined,
          },
        })
      );
    }
    if (entry.weight) {
      docs.push(
        Measurement.create({
          userId: uid,
          type: 'weight',
          measuredAt,
          source,
          payload: { kg: Number(entry.weight) },
        })
      );
    }
    return docs;
  });

  await Promise.all(tasks);
  return NextResponse.json({ ok: true, imported: tasks.length });
}
