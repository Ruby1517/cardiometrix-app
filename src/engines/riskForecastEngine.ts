import dayjs from 'dayjs';
import RiskScore from '@/models/RiskScore';

type RiskDoc = { date: string; score: number };

type ForecastPoint = {
  days: number;
  score: number;
  band: 'green' | 'amber' | 'red';
};

type ForecastResult = {
  asOf: string;
  currentScore: number;
  currentBand: 'green' | 'amber' | 'red';
  slopePerDay: number;
  confidence: 'low' | 'medium' | 'high';
  horizons: ForecastPoint[];
  explanation: string;
};

function bandForScore(score: number): 'green' | 'amber' | 'red' {
  if (score < 0.33) return 'green';
  if (score < 0.66) return 'amber';
  return 'red';
}

function clampScore(score: number) {
  return Math.max(0, Math.min(1, score));
}

function linearSlope(points: { x: number; y: number }[]): number | null {
  if (points.length < 2) return null;
  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  const num = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const den = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (den === 0) return null;
  return num / den;
}

function confidenceLevel(points: number[], slope: number) {
  if (points.length >= 21 && Math.abs(slope) < 0.01) return 'high';
  if (points.length >= 14) return 'medium';
  return 'low';
}

export async function computeRiskForecast(userId: string, horizons: number[] = [30, 60, 90]) {
  const end = dayjs().endOf('day');
  const start = end.subtract(29, 'day').startOf('day');

  const riskDocs = await RiskScore.find({
    userId,
    date: { $gte: start.format('YYYY-MM-DD'), $lte: end.format('YYYY-MM-DD') },
  })
    .sort({ date: 1 })
    .lean<RiskDoc[]>();

  const series = riskDocs.filter((r) => typeof r.score === 'number');
  if (!series.length) return null;

  const baseDate = dayjs(series[0].date);
  const points = series.map((r) => ({
    x: dayjs(r.date).diff(baseDate, 'day'),
    y: r.score,
  }));
  const slope = linearSlope(points);
  if (slope === null) return null;

  const latest = series[series.length - 1];
  const currentScore = clampScore(latest.score);
  const currentBand = bandForScore(currentScore);
  const confidence = confidenceLevel(points.map((p) => p.y), slope);

  const horizonsOutput = horizons.map((days) => {
    const projected = clampScore(currentScore + slope * days);
    return { days, score: projected, band: bandForScore(projected) };
  });

  const slopeLabel = slope === 0 ? 'flat' : slope > 0 ? 'increasing' : 'decreasing';
  const explanation = `Projection assumes your last ${series.length} days of risk remain ${slopeLabel}.`;

  const result: ForecastResult = {
    asOf: latest.date,
    currentScore,
    currentBand,
    slopePerDay: slope,
    confidence,
    horizons: horizonsOutput,
    explanation,
  };

  return result;
}
