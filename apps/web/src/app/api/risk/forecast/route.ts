import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import RiskDaily from '@/models/RiskDaily';
import { initServer } from '@/index';

const querySchema = z.object({
  horizons: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return [30, 60, 90];
      return value
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0)
        .slice(0, 10);
    }),
});

function bandFor(score: number | null): 'green' | 'amber' | 'red' {
  if (score === null || Number.isNaN(score)) return 'amber';
  if (score < 0.33) return 'green';
  if (score < 0.66) return 'amber';
  return 'red';
}

export async function GET(req: NextRequest) {
  initServer();
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const parsed = querySchema.safeParse({ horizons: req.nextUrl.searchParams.get('horizons') || undefined });
  if (!parsed.success || parsed.data.horizons.length === 0) {
    return NextResponse.json({ error: 'Invalid horizons query' }, { status: 422 });
  }

  const today = dayjs().format('YYYY-MM-DD');
  const last14 = dayjs().subtract(13, 'day').format('YYYY-MM-DD');
  const rows = await RiskDaily.find({ userId: uid, as_of_date: { $gte: last14, $lte: today } })
    .sort({ as_of_date: 1 })
    .lean();

  const scores = rows
    .map((r) => {
      const risk = (r as { risk?: unknown }).risk;
      return typeof risk === 'number' ? risk : null;
    })
    .filter((v): v is number => v !== null);

  const todayScore = (() => {
    const entry = rows.find((r) => (r as { as_of_date?: unknown }).as_of_date === today) as
      | { risk?: unknown }
      | undefined;
    return typeof entry?.risk === 'number' ? entry.risk : null;
  })();
  const avg7 = scores.length ? scores.slice(-7).reduce((sum, v) => sum + v, 0) / Math.min(scores.length, 7) : null;
  const max14 = scores.length ? Math.max(...scores) : null;

  const horizonValue = (days: number) => {
    if (days <= 30) return todayScore;
    if (days <= 60) return avg7;
    return max14;
  };

  const mapped = parsed.data.horizons.map((days) => {
    const score = horizonValue(days);
    return {
      days,
      score: score ?? 0,
      band: bandFor(score),
    };
  });

  const currentScore = todayScore ?? avg7 ?? max14 ?? 0;
  const currentBand = bandFor(todayScore ?? avg7 ?? max14 ?? null);

  return NextResponse.json({
    forecast: {
      asOf: today,
      currentScore,
      currentBand,
      slopePerDay: 0,
      confidence: scores.length >= 10 ? 'high' : scores.length >= 5 ? 'medium' : 'low',
      horizons: mapped,
      explanation: 'Forecast uses MVP mapping: 30d=today, 60d=avg(7d), 90d=max(14d).',
    },
  });
}
