import dayjs from 'dayjs';
import Measurement from '@/models/Measurement';

type Anomaly = {
  type: 'bp' | 'weight';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  date: string;
};

type MeasurementDoc = { measuredAt: Date; payload?: Record<string, number> };

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export async function detectAnomalies(userId: string) {
  const today = dayjs();
  const last14 = today.subtract(13, 'day').startOf('day').toDate();
  const last3 = today.subtract(2, 'day').startOf('day').toDate();

  const bpRows = await Measurement.find({
    userId,
    type: 'bp',
    measuredAt: { $gte: last14 },
  }).sort({ measuredAt: -1 }).lean<MeasurementDoc[]>();

  const wtRows = await Measurement.find({
    userId,
    type: 'weight',
    measuredAt: { $gte: last14 },
  }).sort({ measuredAt: -1 }).lean<MeasurementDoc[]>();

  const anomalies: Anomaly[] = [];

  if (bpRows.length) {
    const recent = bpRows[0];
    const recentSys = recent.payload?.systolic;
    const recentDia = recent.payload?.diastolic;
    const baselineRows = bpRows.filter((row) => row.measuredAt < recent.measuredAt);
    const baselineSys = mean(
      baselineRows.map((row) => row.payload?.systolic).filter((v): v is number => typeof v === 'number')
    );
    const baselineDia = mean(
      baselineRows.map((row) => row.payload?.diastolic).filter((v): v is number => typeof v === 'number')
    );

    if (typeof recentSys === 'number' && baselineSys !== null && recentSys - baselineSys >= 15) {
      anomalies.push({
        type: 'bp',
        severity: 'warning',
        title: 'Systolic spike',
        detail: `Latest systolic is ${recentSys} mmHg, ~${Math.round(recentSys - baselineSys)} above your 2-week average.`,
        date: dayjs(recent.measuredAt).format('YYYY-MM-DD'),
      });
    }
    if (typeof recentDia === 'number' && baselineDia !== null && recentDia - baselineDia >= 10) {
      anomalies.push({
        type: 'bp',
        severity: 'warning',
        title: 'Diastolic spike',
        detail: `Latest diastolic is ${recentDia} mmHg, ~${Math.round(recentDia - baselineDia)} above your 2-week average.`,
        date: dayjs(recent.measuredAt).format('YYYY-MM-DD'),
      });
    }
  }

  if (wtRows.length) {
    const recent = wtRows[0];
    const recentKg = recent.payload?.kg;
    const last3Rows = wtRows.filter((row) => row.measuredAt >= last3);
    const baselineRows = wtRows.filter((row) => row.measuredAt < last3);
    const baseline = mean(
      baselineRows.map((row) => row.payload?.kg).filter((v): v is number => typeof v === 'number')
    );
    const recentAvg = mean(
      last3Rows.map((row) => row.payload?.kg).filter((v): v is number => typeof v === 'number')
    );

    if (typeof recentKg === 'number' && baseline !== null && recentAvg !== null && recentAvg - baseline >= 1.5) {
      anomalies.push({
        type: 'weight',
        severity: 'warning',
        title: 'Rapid weight gain',
        detail: `Average weight over 3 days is up ${Math.round((recentAvg - baseline) * 10) / 10} kg vs prior 2 weeks.`,
        date: dayjs(recent.measuredAt).format('YYYY-MM-DD'),
      });
    }
  }

  return anomalies;
}
