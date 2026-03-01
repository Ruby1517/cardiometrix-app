import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Medication from '@/models/Medication';
import MedicationAdherence from '@/models/MedicationAdherence';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const meds = await Medication.find({ userId: uid, active: true })
    .sort({ createdAt: -1 })
    .lean();

  const medIds = meds.map((m: any) => m._id);
  const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
  const adherenceRows = await MedicationAdherence.find({
    userId: uid,
    medicationId: { $in: medIds },
    date: { $gte: startDate }
  }).lean();

  const adherenceByMed = new Map<string, Map<string, string>>();
  for (const row of adherenceRows as any[]) {
    const medId = String(row.medicationId);
    if (!adherenceByMed.has(medId)) adherenceByMed.set(medId, new Map());
    adherenceByMed.get(medId)!.set(row.date, row.status);
  }

  const last7Dates = Array.from({ length: 7 }, (_, i) =>
    dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD')
  );

  const entries = meds.map((m: any) => {
    const medId = String(m._id);
    const map = adherenceByMed.get(medId) || new Map();
    const last7 = last7Dates.map((date) => ({
      date,
      status: map.get(date) || null
    }));
    let streak = 0;
    for (let i = last7.length - 1; i >= 0; i -= 1) {
      if (last7[i].status === 'taken') streak += 1;
      else break;
    }
    return {
      id: medId,
      name: m.name,
      dose: m.dose,
      schedule: m.schedule,
      streak,
      last7
    };
  });

  return NextResponse.json({ medications: entries });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const doc = await Medication.create({
    userId: uid,
    name: body?.name,
    dose: body?.dose,
    schedule: body?.schedule,
    active: true
  });

  return NextResponse.json({ id: doc._id });
}
