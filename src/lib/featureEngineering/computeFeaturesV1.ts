import dayjs from 'dayjs';
import Measurement from '@/models/Measurement';
import DailyNudge from '@/models/DailyNudge';
import Nudge from '@/models/Nudge';
import { FEATURE_CLAMPS, FeatureCoverage, FeaturesV1, featuresV1Schema } from '@/lib/featureEngineering/featuresV1';

type NumericPoint = { ts: Date; value: number };

type RawMeasurement = {
  measuredAt?: Date;
  ts?: Date;
  type: string;
  payload?: Record<string, unknown>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function linearSlope(points: NumericPoint[], minPoints = 3): number {
  if (points.length < minPoints) return 0;
  const sorted = [...points].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const start = sorted[0].ts.getTime();
  const xs = sorted.map((p) => (p.ts.getTime() - start) / 86_400_000);
  const ys = sorted.map((p) => p.value);
  const xMean = mean(xs);
  const yMean = mean(ys);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < xs.length; i += 1) {
    numerator += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function pickDate(row: RawMeasurement): Date | null {
  if (row.measuredAt instanceof Date) return row.measuredAt;
  if (row.ts instanceof Date) return row.ts;
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractPoints(rows: RawMeasurement[], type: string, extractor: (payload: Record<string, unknown>) => number | null) {
  const points: NumericPoint[] = [];
  for (const row of rows) {
    if (row.type !== type || !row.payload) continue;
    const ts = pickDate(row);
    if (!ts) continue;
    const value = extractor(row.payload);
    if (value === null) continue;
    points.push({ ts, value });
  }
  return points;
}

function inWindow(point: NumericPoint, from: dayjs.Dayjs, to: dayjs.Dayjs) {
  const t = dayjs(point.ts);
  return (t.isAfter(from) || t.isSame(from)) && (t.isBefore(to) || t.isSame(to));
}

function computeZScore(recent: NumericPoint[], baseline: NumericPoint[]) {
  if (!recent.length || baseline.length < 3) return 0;
  const recentMean = mean(recent.map((p) => p.value));
  const baselineVals = baseline.map((p) => p.value);
  const baselineMean = mean(baselineVals);
  const baselineStd = Math.max(std(baselineVals), 0.25);
  return (recentMean - baselineMean) / baselineStd;
}

export function deriveFeaturesFromRecords(params: {
  userId: string;
  asOfDate: string;
  measurements: RawMeasurement[];
  nudgeStatuses7d: Array<'pending' | 'done' | 'snoozed' | 'sent' | 'completed' | 'skipped'>;
}): { features: FeaturesV1; coverage: FeatureCoverage; sufficientData: boolean } {
  const { userId, asOfDate, measurements, nudgeStatuses7d } = params;
  const trendDays = Number(process.env.BP_TREND_DAYS || 14);
  const varDays = Number(process.env.VAR_DAYS || 7);
  const baselineDays = Number(process.env.BASELINE_DAYS || 30);
  const recentDays = Number(process.env.RECENT_DAYS || 7);

  const dayEnd = dayjs(asOfDate).endOf('day');
  const dayStart = dayjs(asOfDate).startOf('day');
  const lastRecentStart = dayStart.subtract(Math.max(recentDays - 1, 0), 'day');
  const lastTrendStart = dayStart.subtract(Math.max(trendDays - 1, 0), 'day');
  const baselineStart = dayStart.subtract(Math.max(baselineDays, recentDays + 7), 'day');
  const baselineEnd = dayStart.subtract(Math.max(recentDays, 1), 'day').endOf('day');
  const varStart = dayStart.subtract(Math.max(varDays - 1, 0), 'day');

  const sysPoints = extractPoints(measurements, 'bp', (p) => toNumber(p.systolic));
  const diaPoints = extractPoints(measurements, 'bp', (p) => toNumber(p.diastolic));
  const weightPoints = extractPoints(measurements, 'weight', (p) => toNumber(p.kg));
  const hrvPoints = extractPoints(measurements, 'hrv', (p) => toNumber(p.rmssd) ?? toNumber(p.ms));
  const hrPoints = extractPoints(measurements, 'hr', (p) => toNumber(p.bpm));
  const stepsPoints = extractPoints(measurements, 'steps', (p) => toNumber(p.count));
  const sleepPoints = extractPoints(measurements, 'sleep', (p) => {
    const hours = toNumber(p.hours);
    if (hours !== null) return hours;
    const minutes = toNumber(p.minutes);
    if (minutes !== null) return minutes / 60;
    return null;
  });

  const glucosePoints = extractPoints(measurements, 'glucose', (p) => {
    const mgdl = toNumber(p.mgdl);
    if (mgdl !== null) return mgdl;
    const mmol = toNumber(p.mmol);
    return mmol !== null ? mmol * 18.0182 : null;
  });

  const a1cCandidates = extractPoints(measurements, 'a1c', (p) => toNumber(p.value) ?? toNumber(p.percent));
  const ldlCandidates = extractPoints(measurements, 'lipid', (p) => toNumber(p.ldl));

  const inRecent = (p: NumericPoint) => inWindow(p, lastRecentStart, dayEnd);
  const inTrend = (p: NumericPoint) => inWindow(p, lastTrendStart, dayEnd);
  const inBaseline = (p: NumericPoint) => inWindow(p, baselineStart, baselineEnd);
  const inVar = (p: NumericPoint) => inWindow(p, varStart, dayEnd);

  const sysVar = sysPoints.filter(inVar).map((p) => p.value);
  const diaVar = diaPoints.filter(inVar).map((p) => p.value);

  const bpSysTrend = clamp(linearSlope(sysPoints.filter(inTrend)), FEATURE_CLAMPS.bpTrend.min, FEATURE_CLAMPS.bpTrend.max);
  const bpDiaTrend = clamp(linearSlope(diaPoints.filter(inTrend)), FEATURE_CLAMPS.bpTrend.min, FEATURE_CLAMPS.bpTrend.max);
  const weightTrend = clamp(linearSlope(weightPoints.filter(inTrend)), FEATURE_CLAMPS.weightTrend.min, FEATURE_CLAMPS.weightTrend.max);
  const glucoseTrend = clamp(
    linearSlope(glucosePoints.filter(inTrend)),
    FEATURE_CLAMPS.glucoseTrend.min,
    FEATURE_CLAMPS.glucoseTrend.max,
  );

  const bpSysVar = clamp(std(sysVar), FEATURE_CLAMPS.bpVar.min, FEATURE_CLAMPS.bpVar.max);
  const bpDiaVar = clamp(std(diaVar), FEATURE_CLAMPS.bpVar.min, FEATURE_CLAMPS.bpVar.max);

  const hrvZ = clamp(
    computeZScore(hrvPoints.filter(inRecent), hrvPoints.filter(inBaseline)),
    FEATURE_CLAMPS.z.min,
    FEATURE_CLAMPS.z.max,
  );
  const rhrZ = clamp(
    computeZScore(hrPoints.filter(inRecent), hrPoints.filter(inBaseline)),
    FEATURE_CLAMPS.z.min,
    FEATURE_CLAMPS.z.max,
  );
  const stepsZ = clamp(
    computeZScore(stepsPoints.filter(inRecent), stepsPoints.filter(inBaseline)),
    FEATURE_CLAMPS.z.min,
    FEATURE_CLAMPS.z.max,
  );

  const sleepRecent = sleepPoints.filter(inRecent);
  const sleepByDay = new Map<string, number>();
  for (const point of sleepRecent) {
    const key = dayjs(point.ts).format('YYYY-MM-DD');
    sleepByDay.set(key, Math.max(sleepByDay.get(key) ?? 0, point.value));
  }
  let debtTotal = 0;
  for (let i = 0; i < recentDays; i += 1) {
    const date = dayStart.subtract(i, 'day').format('YYYY-MM-DD');
    const sleepHours = sleepByDay.get(date) ?? 0;
    debtTotal += Math.max(0, 7.5 - sleepHours);
  }
  const sleepDebtHours = clamp(debtTotal / Math.max(recentDays, 1), FEATURE_CLAMPS.sleepDebt.min, FEATURE_CLAMPS.sleepDebt.max);

  const days180 = dayStart.subtract(180, 'day');
  const latestA1c = [...a1cCandidates]
    .filter((p) => inWindow(p, days180, dayEnd))
    .sort((a, b) => b.ts.getTime() - a.ts.getTime())[0]?.value;

  const latestLdl = [...ldlCandidates]
    .filter((p) => inWindow(p, days180, dayEnd))
    .sort((a, b) => b.ts.getTime() - a.ts.getTime())[0]?.value;

  const shownCount = nudgeStatuses7d.length;
  const doneCount = nudgeStatuses7d.filter((s) => s === 'done' || s === 'completed').length;
  const adherence = clamp(shownCount > 0 ? doneCount / shownCount : 0.5, FEATURE_CLAMPS.adherence.min, FEATURE_CLAMPS.adherence.max);

  const featurePayload: FeaturesV1 = {
    user_id: userId,
    as_of_date: asOfDate,
    bp_sys_trend_14d: bpSysTrend,
    bp_sys_var_7d: bpSysVar,
    bp_dia_trend_14d: bpDiaTrend,
    bp_dia_var_7d: bpDiaVar,
    hrv_z_7d: hrvZ,
    rhr_z_7d: rhrZ,
    steps_z_7d: stepsZ,
    sleep_debt_hours_7d: sleepDebtHours,
    weight_trend_14d: weightTrend,
    glucose_trend_14d: glucoseTrend,
    a1c_latest: latestA1c ?? null,
    ldl_latest: latestLdl ?? null,
    adherence_nudge_7d: adherence,
  };

  const coverage: FeatureCoverage = {
    totalPoints30d: measurements.filter((row) => {
      const ts = pickDate(row);
      return ts ? inWindow({ ts, value: 0 }, baselineStart, dayEnd) : false;
    }).length,
    bpPoints14d: sysPoints.filter(inTrend).length,
    weightPoints14d: weightPoints.filter(inTrend).length,
    stepsPoints7d: stepsPoints.filter(inRecent).length,
    sleepPoints7d: sleepPoints.filter(inRecent).length,
  };

  const sufficientData = coverage.totalPoints30d >= 3 && (coverage.bpPoints14d >= 1 || coverage.weightPoints14d >= 1);

  return { features: featuresV1Schema.parse(featurePayload), coverage, sufficientData };
}

export async function computeFeaturesV1(userId: string, asOfDate: string) {
  const start180 = dayjs(asOfDate).subtract(180, 'day').startOf('day').toDate();
  const end = dayjs(asOfDate).endOf('day').toDate();

  const [measurements, legacyNudges, dailyNudges] = await Promise.all([
    Measurement.find({
      userId,
      measuredAt: { $gte: start180, $lte: end },
      type: { $in: ['bp', 'weight', 'hr', 'hrv', 'steps', 'sleep', 'a1c', 'lipid', 'glucose'] },
    })
      .select('type measuredAt payload')
      .lean(),
    Nudge.find({
      userId,
      date: { $gte: dayjs(asOfDate).subtract(6, 'day').format('YYYY-MM-DD'), $lte: asOfDate },
    })
      .select('status')
      .lean(),
    DailyNudge.find({
      userId,
      as_of_date: { $gte: dayjs(asOfDate).subtract(6, 'day').format('YYYY-MM-DD'), $lte: asOfDate },
    })
      .select('status')
      .lean(),
  ]);

  const statuses = [
    ...legacyNudges.map((n) => String((n as { status?: unknown }).status) as 'sent' | 'completed' | 'skipped'),
    ...dailyNudges.map((n) => String((n as { status?: unknown }).status) as 'pending' | 'done' | 'snoozed'),
  ];

  return deriveFeaturesFromRecords({
    userId,
    asOfDate,
    measurements: measurements as unknown as RawMeasurement[],
    nudgeStatuses7d: statuses,
  });
}
