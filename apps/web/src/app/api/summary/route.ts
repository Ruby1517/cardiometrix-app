import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';
import SymptomCheckin from '@/models/SymptomCheckin';
import MedicationAdherence from '@/models/MedicationAdherence';
import { buildSummaryNarrative, computeSummaryStats } from '@/engines/summaryEngine';

const PERIOD_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
};

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'week';
  const days = PERIOD_DAYS[period] ?? PERIOD_DAYS.week;
  const periodLabel = period === 'month' ? 'month' : 'week';
  const periodEnd = dayjs().endOf('day');
  const periodStart = periodEnd.subtract(days - 1, 'day').startOf('day');

  const [measurements, symptoms, adherenceLogs] = await Promise.all([
    Measurement.find({
      userId: uid,
      measuredAt: { $gte: periodStart.toDate() },
    }).sort({ measuredAt: -1 }).lean(),
    SymptomCheckin.find({
      userId: uid,
      checkedAt: { $gte: periodStart.toDate() },
    }).sort({ checkedAt: -1 }).lean(),
    MedicationAdherence.find({
      userId: uid,
      date: {
        $gte: periodStart.format('YYYY-MM-DD'),
        $lte: periodEnd.format('YYYY-MM-DD'),
      },
    }).lean(),
  ]);

  const bpReadings = (measurements as any[])
    .filter((row) => row.type === 'bp')
    .map((row) => ({
      systolic: row.payload?.systolic,
      diastolic: row.payload?.diastolic,
      pulse: row.payload?.pulse,
      measuredAt: row.measuredAt ?? new Date(),
    }));

  const weightReadings = (measurements as any[])
    .filter((row) => row.type === 'weight')
    .map((row) => ({
      kg: row.payload?.kg,
      measuredAt: row.measuredAt ?? new Date(),
    }));

  const summaryStats = computeSummaryStats(
    {
      bpReadings,
      weightReadings,
      symptoms: (symptoms as any[]).map((row) => ({
        symptoms: row.symptoms ?? {},
        checkedAt: row.checkedAt ?? new Date(),
      })),
      adherenceLogs: (adherenceLogs as any[]).map((row) => ({
        status: row.status,
        date: row.date,
      })),
    },
    periodLabel,
  );

  const narrative = buildSummaryNarrative(summaryStats);

  return NextResponse.json({
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    bp: summaryStats.bp,
    weight: summaryStats.weight,
    pulse: summaryStats.pulse,
    symptoms: summaryStats.symptoms,
    meds: summaryStats.meds,
    narrative,
  });
}
