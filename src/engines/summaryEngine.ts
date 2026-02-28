type TrendDirection = 'up' | 'down' | 'flat' | 'unknown';

export type SummaryStats = {
  periodLabel: string;
  bp: {
    avgSys: number | null;
    avgDia: number | null;
    trend: TrendDirection;
  };
  weight: {
    delta: number | null;
    trend: TrendDirection;
  };
  pulse: {
    avg: number | null;
  };
  symptoms: {
    count: number;
    top: string | null;
  };
  meds: {
    adherenceRate: number | null;
  };
};

export type SummaryEventInput = {
  bpReadings: { systolic?: number; diastolic?: number; pulse?: number; measuredAt: Date }[];
  weightReadings: { kg?: number; measuredAt: Date }[];
  symptoms: { symptoms?: Record<string, boolean>; checkedAt: Date }[];
  adherenceLogs: { status: 'taken' | 'missed'; date: string }[];
};

export function buildSummaryNarrative(stats: SummaryStats) {
  const sentences: string[] = [];
  sentences.push(`Here is your summary for the past ${stats.periodLabel}.`);

  const positive = pickPositive(stats);
  const watch = pickWatch(stats);
  const suggestion = pickSuggestion(stats);
  sentences.push(positive, watch, suggestion);

  const missing = buildMissingSentence(stats);
  if (missing) sentences.push(missing);

  return sentences.slice(0, 6).join(' ');
}

export function computeSummaryStats(
  input: SummaryEventInput,
  periodLabel: string,
): SummaryStats {
  const bpValues = input.bpReadings
    .map((row) => ({
      systolic: toNumber(row.systolic),
      diastolic: toNumber(row.diastolic),
      pulse: toNumber(row.pulse),
      measuredAt: row.measuredAt,
    }))
    .filter((row) => row.systolic !== null || row.diastolic !== null || row.pulse !== null);

  const weightValues = input.weightReadings
    .map((row) => ({ kg: toNumber(row.kg), measuredAt: row.measuredAt }))
    .filter((row) => row.kg !== null);

  const avgSys = average(bpValues.map((row) => row.systolic).filter(isNumber));
  const avgDia = average(bpValues.map((row) => row.diastolic).filter(isNumber));
  const avgPulse = average(bpValues.map((row) => row.pulse).filter(isNumber));

  const bpTrend = trendFromSlope(calcSlope(bpValues.map((row) => ({ value: row.systolic, at: row.measuredAt }))));
  const weightTrend = trendFromSlope(
    calcSlope(weightValues.map((row) => ({ value: row.kg, at: row.measuredAt }))),
  );
  const weightDelta = calcDelta(weightValues.map((row) => ({ value: row.kg, at: row.measuredAt })));

  const symptomsCount = input.symptoms.length;
  const topSymptom = pickTopSymptom(input.symptoms);

  const adherenceRate = calcAdherenceRate(input.adherenceLogs);

  return {
    periodLabel,
    bp: { avgSys, avgDia, trend: bpTrend },
    weight: { delta: weightDelta, trend: weightTrend },
    pulse: { avg: avgPulse },
    symptoms: { count: symptomsCount, top: topSymptom },
    meds: { adherenceRate },
  };
}

export function buildSummaryNarrativeFromInput(input: SummaryEventInput, periodLabel: string) {
  return buildSummaryNarrative(computeSummaryStats(input, periodLabel));
}

function pickPositive(stats: SummaryStats) {
  if (stats.bp.trend === 'flat') return 'Blood pressure stayed steady.';
  if (stats.weight.trend === 'flat') return 'Weight stayed steady.';
  if (stats.meds.adherenceRate !== null && stats.meds.adherenceRate >= 80) {
    return 'Medication check-ins were consistent.';
  }
  if (stats.symptoms.count === 0) return 'No symptom check-ins were reported.';
  if (stats.pulse.avg !== null) return 'Pulse readings were steady this period.';
  return 'Thanks for logging your health updates.';
}

function pickWatch(stats: SummaryStats) {
  if (stats.bp.trend === 'up') return 'Blood pressure trended upward.';
  if (stats.weight.trend === 'up') return 'Weight trended upward.';
  if (stats.meds.adherenceRate !== null && stats.meds.adherenceRate < 80) {
    return 'Medication check-ins were less consistent than usual.';
  }
  if (stats.symptoms.count > 0) {
    return stats.symptoms.top ? `Symptoms were noted, mainly ${stats.symptoms.top}.` : 'Symptoms were noted this period.';
  }
  if (stats.bp.trend === 'down') return 'Blood pressure trended downward.';
  return 'No major changes stood out.';
}

function pickSuggestion(stats: SummaryStats) {
  if (stats.bp.trend === 'up') return 'Try adding a few extra BP readings at different times of day.';
  if (stats.weight.trend === 'up') return 'A short daily walk and hydration check can help keep weight steady.';
  if (stats.meds.adherenceRate !== null && stats.meds.adherenceRate < 80) {
    return 'Set a reminder to log medications each day.';
  }
  if (stats.symptoms.count > 0) return 'Keep noting symptoms and what was happening when they appeared.';
  return 'Keep logging to build a clearer pattern.';
}

function buildMissingSentence(stats: SummaryStats) {
  const missing: string[] = [];
  if (stats.bp.avgSys === null || stats.bp.avgDia === null) missing.push('blood pressure');
  if (stats.weight.delta === null) missing.push('weight');
  if (stats.pulse.avg === null) missing.push('pulse');
  if (stats.symptoms.count === 0) missing.push('symptoms');
  if (stats.meds.adherenceRate === null) missing.push('medication check-ins');

  if (!missing.length) return '';
  if (missing.length === 1) {
    return `To make this more complete, add ${missing[0]} entries next.`;
  }
  const last = missing.pop();
  return `To make this more complete, add ${missing.join(', ')} and ${last} next.`;
}

function calcSlope(points: { value: number | null; at: Date }[]) {
  const clean = points.filter((point): point is { value: number; at: Date } => isNumber(point.value));
  if (clean.length < 2) return null;
  const sorted = [...clean].sort((a, b) => a.at.getTime() - b.at.getTime());
  const startTime = sorted[0].at.getTime();
  const series = sorted.map((point) => ({
    x: (point.at.getTime() - startTime) / (1000 * 60 * 60 * 24),
    y: point.value,
  }));
  const meanX = series.reduce((sum, point) => sum + point.x, 0) / series.length;
  const meanY = series.reduce((sum, point) => sum + point.y, 0) / series.length;
  const numerator = series.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = series.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function calcDelta(points: { value: number | null; at: Date }[]) {
  const clean = points.filter((point): point is { value: number; at: Date } => isNumber(point.value));
  if (clean.length < 2) return null;
  const sorted = [...clean].sort((a, b) => a.at.getTime() - b.at.getTime());
  return sorted[sorted.length - 1].value - sorted[0].value;
}

function trendFromSlope(slope: number | null): TrendDirection {
  if (slope === null) return 'unknown';
  if (Math.abs(slope) < 0.05) return 'flat';
  return slope > 0 ? 'up' : 'down';
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function toNumber(value: number | string | undefined) {
  if (value === undefined) return null;
  const numeric = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

function pickTopSymptom(entries: { symptoms?: Record<string, boolean> }[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const symptoms = entry.symptoms ?? {};
    for (const [key, value] of Object.entries(symptoms)) {
      if (key === 'otherText') continue;
      if (!value) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let top: string | null = null;
  let max = 0;
  for (const [key, count] of counts.entries()) {
    if (count > max) {
      max = count;
      top = key;
    }
  }
  return top;
}

function calcAdherenceRate(logs: { status: 'taken' | 'missed' }[]) {
  if (!logs.length) return null;
  const taken = logs.filter((log) => log.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
}
