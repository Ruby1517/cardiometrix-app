import dayjs from 'dayjs';
import Measurement from '@/models/Measurement';
import RiskScore from '@/models/RiskScore';
import WeeklyRiskSummary from '@/models/WeeklyRiskSummary';

type SeriesPoint = { date: string; value: number };
type SlopePoint = { x: number; y: number };
type RiskDoc = { date: string; score: number };
type MeasurementDoc = { measuredAt: Date; payload?: Record<string, number> };

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function slope(points: SlopePoint[]): number | null {
  if (points.length < 2) return null;
  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  const num = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const den = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (den === 0) return null;
  return num / den;
}

function seriesToSlopePoints(series: SeriesPoint[]): SlopePoint[] {
  if (!series.length) return [];
  const start = dayjs(series[0].date);
  return series.map((p) => ({
    x: dayjs(p.date).diff(start, 'day'),
    y: p.value
  }));
}

function avgForWindow(series: SeriesPoint[], startDate: string): number | null {
  const values = series.filter((p) => p.date >= startDate).map((p) => p.value);
  return mean(values);
}

function buildDailySeries<T extends MeasurementDoc>(
  measurements: T[],
  valueSelector: (m: T) => number | null
): SeriesPoint[] {
  const byDate = new Map<string, number[]>();
  for (const m of measurements) {
    const v = valueSelector(m);
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    const date = dayjs(m.measuredAt).format('YYYY-MM-DD');
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(v);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, value: mean(values) || 0 }));
}

function formatDelta(value: number | null, unit: string, days = 14): string | null {
  if (value === null) return null;
  const delta = value * (days - 1);
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} ${unit}`;
}

export async function computeWeeklyRiskSummary(userId: string, dateISO: string) {
  const weekStart = dayjs(dateISO).startOf('week');
  const weekEnd = weekStart.add(6, 'day');
  const start14 = dayjs(dateISO).subtract(13, 'day').startOf('day');
  const end = dayjs(dateISO).endOf('day');
  const start7 = dayjs(dateISO).subtract(6, 'day').format('YYYY-MM-DD');

  const riskDocs = await RiskScore.find({
    userId,
    date: { $gte: start14.format('YYYY-MM-DD'), $lte: dateISO }
  }).sort({ date: 1 }).lean<RiskDoc[]>();
  const riskSeries = riskDocs
    .filter((r) => typeof r.score === 'number')
    .map((r) => ({ date: r.date, value: r.score }));

  const bpMeasurements = await Measurement.find({
    userId,
    type: 'bp',
    measuredAt: { $gte: start14.toDate(), $lte: end.toDate() }
  }).lean<MeasurementDoc[]>();
  const weightMeasurements = await Measurement.find({
    userId,
    type: 'weight',
    measuredAt: { $gte: start14.toDate(), $lte: end.toDate() }
  }).lean<MeasurementDoc[]>();

  const bpSysSeries = buildDailySeries(bpMeasurements, (m) => m?.payload?.systolic ?? null);
  const bpDiaSeries = buildDailySeries(bpMeasurements, (m) => m?.payload?.diastolic ?? null);
  const weightSeries = buildDailySeries(weightMeasurements, (m) => m?.payload?.kg ?? null);

  const metrics = {
    risk_score_avg_7d: avgForWindow(riskSeries, start7),
    risk_score_slope_14d: slope(seriesToSlopePoints(riskSeries)),
    bp_sys_avg_7d: avgForWindow(bpSysSeries, start7),
    bp_sys_slope_14d: slope(seriesToSlopePoints(bpSysSeries)),
    bp_dia_avg_7d: avgForWindow(bpDiaSeries, start7),
    bp_dia_slope_14d: slope(seriesToSlopePoints(bpDiaSeries)),
    weight_avg_7d: avgForWindow(weightSeries, start7),
    weight_slope_14d: slope(seriesToSlopePoints(weightSeries))
  };
  const hasAnyData = Boolean(
    riskSeries.length || bpSysSeries.length || bpDiaSeries.length || weightSeries.length
  );

  const thresholds = {
    riskSlope: 0.003,
    bpSysSlope: 0.4,
    bpDiaSlope: 0.2,
    weightSlope: 0.05
  };

  const explanations: string[] = [];
  const riskDelta = formatDelta(metrics.risk_score_slope_14d, 'risk score', 14);
  const sysDelta = formatDelta(metrics.bp_sys_slope_14d, 'mmHg', 14);
  const diaDelta = formatDelta(metrics.bp_dia_slope_14d, 'mmHg', 14);
  const wtDelta = formatDelta(metrics.weight_slope_14d, 'kg', 14);

  if (metrics.risk_score_avg_7d !== null) {
    explanations.push(`This week's average risk score is ${metrics.risk_score_avg_7d.toFixed(2)}.`);
  }
  if (!hasAnyData) {
    explanations.push('Add at least a few BP and weight readings to generate weekly trends.');
  }
  if (riskDelta && Math.abs(metrics.risk_score_slope_14d || 0) >= thresholds.riskSlope) {
    explanations.push(`Risk score is trending ${metrics.risk_score_slope_14d! > 0 ? 'up' : 'down'} over 2 weeks (${riskDelta}).`);
  }
  if (metrics.bp_sys_avg_7d !== null) {
    explanations.push(`Average systolic BP this week is ${metrics.bp_sys_avg_7d.toFixed(0)} mmHg.`);
  }
  if (sysDelta && Math.abs(metrics.bp_sys_slope_14d || 0) >= thresholds.bpSysSlope) {
    explanations.push(`Systolic BP is ${metrics.bp_sys_slope_14d! > 0 ? 'rising' : 'falling'} (${sysDelta} over 2 weeks).`);
  }
  if (metrics.bp_dia_avg_7d !== null) {
    explanations.push(`Average diastolic BP this week is ${metrics.bp_dia_avg_7d.toFixed(0)} mmHg.`);
  }
  if (diaDelta && Math.abs(metrics.bp_dia_slope_14d || 0) >= thresholds.bpDiaSlope) {
    explanations.push(`Diastolic BP is ${metrics.bp_dia_slope_14d! > 0 ? 'rising' : 'falling'} (${diaDelta} over 2 weeks).`);
  }
  if (metrics.weight_avg_7d !== null) {
    explanations.push(`Average weight this week is ${metrics.weight_avg_7d.toFixed(1)} kg.`);
  }
  if (wtDelta && Math.abs(metrics.weight_slope_14d || 0) >= thresholds.weightSlope) {
    explanations.push(`Weight is ${metrics.weight_slope_14d! > 0 ? 'increasing' : 'decreasing'} (${wtDelta} over 2 weeks).`);
  }

  const deteriorationDetected = Boolean(
    (metrics.risk_score_slope_14d !== null && metrics.risk_score_slope_14d > thresholds.riskSlope) ||
    (metrics.bp_sys_slope_14d !== null && metrics.bp_sys_avg_7d !== null &&
      metrics.bp_sys_avg_7d >= 130 && metrics.bp_sys_slope_14d > thresholds.bpSysSlope) ||
    (metrics.bp_dia_slope_14d !== null && metrics.bp_dia_avg_7d !== null &&
      metrics.bp_dia_avg_7d >= 80 && metrics.bp_dia_slope_14d > thresholds.bpDiaSlope) ||
    (metrics.weight_slope_14d !== null && metrics.weight_slope_14d > thresholds.weightSlope)
  );

  let trend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (metrics.risk_score_slope_14d !== null) {
    if (metrics.risk_score_slope_14d > thresholds.riskSlope) trend = 'worsening';
    if (metrics.risk_score_slope_14d < -thresholds.riskSlope) trend = 'improving';
  } else if (deteriorationDetected) {
    trend = 'worsening';
  }

  const summaryText = !hasAnyData
    ? 'Weekly risk summary: not enough data yet. Log measurements to see trends.'
    : deteriorationDetected
      ? 'Weekly risk summary: gradual deterioration detected. Focus on BP control and weight stability.'
      : trend === 'improving'
        ? 'Weekly risk summary: trends are improving. Keep up the current routine.'
        : 'Weekly risk summary: trends are stable. Maintain current habits and monitoring.';

  const doc = {
    userId,
    weekStart: weekStart.format('YYYY-MM-DD'),
    weekEnd: weekEnd.format('YYYY-MM-DD'),
    horizonDays: 7,
    metrics,
    signals: { deteriorationDetected, trend },
    explanations,
    summaryText
  };

  await WeeklyRiskSummary.findOneAndUpdate(
    { userId, weekStart: doc.weekStart },
    doc,
    { upsert: true, new: true }
  );

  return doc;
}
