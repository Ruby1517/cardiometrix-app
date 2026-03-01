import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Medication from '@/models/Medication';
import MedicationAdherence from '@/models/MedicationAdherence';
import Measurement from '@/models/Measurement';
import dayjs from 'dayjs';

type MeasurementDoc = { measuredAt: Date; payload?: Record<string, number> };

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function avgInWindow(rows: MeasurementDoc[], key: string) {
  const values = rows
    .map((row) => row.payload?.[key])
    .filter((value) => typeof value === 'number') as number[];
  return mean(values);
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const meds = await Medication.find({ userId: uid, active: true }).sort({ createdAt: -1 }).lean();
  const windowDays = Number(new URL(req.url).searchParams.get('window') || 14);
  const today = dayjs().format('YYYY-MM-DD');
  const adherenceStart = dayjs().subtract(windowDays - 1, 'day').format('YYYY-MM-DD');

  const insights = await Promise.all(
    meds.map(async (med: any) => {
      const startDate = dayjs(med.createdAt);
      const preStart = startDate.subtract(windowDays, 'day');
      const postEnd = startDate.add(windowDays, 'day');

      const [bpPre, bpPost, wtPre, wtPost, adherence] = await Promise.all([
        Measurement.find({
          userId: uid,
          type: 'bp',
          measuredAt: { $gte: preStart.toDate(), $lt: startDate.toDate() },
        }).lean<MeasurementDoc[]>(),
        Measurement.find({
          userId: uid,
          type: 'bp',
          measuredAt: { $gte: startDate.toDate(), $lte: postEnd.toDate() },
        }).lean<MeasurementDoc[]>(),
        Measurement.find({
          userId: uid,
          type: 'weight',
          measuredAt: { $gte: preStart.toDate(), $lt: startDate.toDate() },
        }).lean<MeasurementDoc[]>(),
        Measurement.find({
          userId: uid,
          type: 'weight',
          measuredAt: { $gte: startDate.toDate(), $lte: postEnd.toDate() },
        }).lean<MeasurementDoc[]>(),
        MedicationAdherence.find({
          userId: uid,
          medicationId: med._id,
          date: { $gte: adherenceStart, $lte: today },
        }).lean(),
      ]);

      const sysPre = avgInWindow(bpPre, 'systolic');
      const sysPost = avgInWindow(bpPost, 'systolic');
      const diaPre = avgInWindow(bpPre, 'diastolic');
      const diaPost = avgInWindow(bpPost, 'diastolic');
      const wtPreAvg = avgInWindow(wtPre, 'kg');
      const wtPostAvg = avgInWindow(wtPost, 'kg');

      const sysDelta = sysPost !== null && sysPre !== null ? sysPost - sysPre : null;
      const diaDelta = diaPost !== null && diaPre !== null ? diaPost - diaPre : null;
      const wtDelta = wtPostAvg !== null && wtPreAvg !== null ? wtPostAvg - wtPreAvg : null;

      const adherenceTaken = adherence.filter((row: any) => row.status === 'taken').length;
      const adherenceRate = adherence.length ? Math.round((adherenceTaken / adherence.length) * 100) : null;

      const summaryParts = [];
      if (sysDelta !== null || diaDelta !== null) {
        summaryParts.push(
          `BP change ${formatSigned(sysDelta)} / ${formatSigned(diaDelta)} mmHg`
        );
      }
      if (wtDelta !== null) {
        summaryParts.push(`Weight change ${formatSigned(wtDelta)} kg`);
      }
      if (!summaryParts.length) {
        summaryParts.push('Not enough data to estimate effect yet.');
      }

      return {
        medicationId: String(med._id),
        name: med.name,
        dose: med.dose,
        schedule: med.schedule,
        startDate: startDate.format('YYYY-MM-DD'),
        adherenceRate,
        deltas: {
          systolic: sysDelta,
          diastolic: diaDelta,
          weight: wtDelta,
        },
        summary: summaryParts.join(' · '),
      };
    })
  );

  return NextResponse.json({ insights });
}

function formatSigned(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  const fixed = Math.abs(value).toFixed(1);
  if (value > 0) return `+${fixed}`;
  if (value < 0) return `-${fixed}`;
  return `0.0`;
}
