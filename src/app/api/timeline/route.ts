import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';
import SymptomCheckin from '@/models/SymptomCheckin';
import Medication from '@/models/Medication';
import dayjs from 'dayjs';

type TimelineEvent = {
  id: string;
  type: 'vital' | 'symptom' | 'med' | 'lab';
  timestamp: string;
  title: string;
  summary: string;
  data: Record<string, unknown>;
};

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '30d';
  const days = RANGE_DAYS[range] ?? 30;
  const startDate = dayjs().subtract(days - 1, 'day').startOf('day').toDate();

  const [measurements, symptoms, meds] = await Promise.all([
    Measurement.find({
      userId: uid,
      measuredAt: { $gte: startDate },
    }).sort({ measuredAt: -1 }).lean(),
    SymptomCheckin.find({
      userId: uid,
      checkedAt: { $gte: startDate },
    }).sort({ checkedAt: -1 }).lean(),
    Medication.find({
      userId: uid,
      createdAt: { $gte: startDate },
    }).sort({ updatedAt: -1 }).lean(),
  ]);

  const events: TimelineEvent[] = [];

  for (const m of measurements as any[]) {
    if (m.type === 'bp') {
      events.push({
        id: String(m._id),
        type: 'vital',
        timestamp: m.measuredAt?.toISOString() ?? new Date().toISOString(),
        title: 'Blood pressure',
        summary: `${m.payload?.systolic ?? '—'}/${m.payload?.diastolic ?? '—'} mmHg`,
        data: {
          systolic: m.payload?.systolic ?? null,
          diastolic: m.payload?.diastolic ?? null,
          pulse: m.payload?.pulse ?? null,
        },
      });
    }
    if (m.type === 'weight') {
      events.push({
        id: String(m._id),
        type: 'vital',
        timestamp: m.measuredAt?.toISOString() ?? new Date().toISOString(),
        title: 'Weight',
        summary: `${m.payload?.kg ?? '—'} kg`,
        data: {
          kg: m.payload?.kg ?? null,
        },
      });
    }
    if (m.type === 'a1c') {
      events.push({
        id: String(m._id),
        type: 'lab',
        timestamp: m.measuredAt?.toISOString() ?? new Date().toISOString(),
        title: 'HbA1c',
        summary: `${m.payload?.percent ?? '—'} %`,
        data: {
          percent: m.payload?.percent ?? null,
        },
      });
    }
    if (m.type === 'lipid') {
      events.push({
        id: String(m._id),
        type: 'lab',
        timestamp: m.measuredAt?.toISOString() ?? new Date().toISOString(),
        title: 'Lipid panel',
        summary: `Total ${m.payload?.total ?? '—'}`,
        data: {
          total: m.payload?.total ?? null,
          ldl: m.payload?.ldl ?? null,
          hdl: m.payload?.hdl ?? null,
          triglycerides: m.payload?.triglycerides ?? null,
        },
      });
    }
  }

  for (const s of symptoms as any[]) {
    const list = Object.entries(s.symptoms || {})
      .filter(([key, value]) => key !== 'otherText' && Boolean(value))
      .map(([key]) => key);
    if (s.symptoms?.otherText) list.push(s.symptoms.otherText);
    events.push({
      id: String(s._id),
      type: 'symptom',
      timestamp: s.checkedAt?.toISOString() ?? new Date().toISOString(),
      title: 'Symptom check-in',
      summary: list.length ? `${list.slice(0, 2).join(', ')} · ${s.severity}/10` : `Severity ${s.severity}/10`,
      data: {
        severity: s.severity ?? null,
        symptoms: list,
        notes: s.notes ?? '',
      },
    });
  }

  for (const med of meds as any[]) {
    const updated = med.updatedAt && med.createdAt && med.updatedAt.getTime() - med.createdAt.getTime() > 60000;
    events.push({
      id: String(med._id),
      type: 'med',
      timestamp: (updated ? med.updatedAt : med.createdAt)?.toISOString() ?? new Date().toISOString(),
      title: updated ? 'Medication updated' : 'Medication added',
      summary: `${med.name} · ${med.dose} · ${med.schedule}`,
      data: {
        name: med.name,
        dose: med.dose,
        schedule: med.schedule,
        active: med.active,
      },
    });
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ events });
}
