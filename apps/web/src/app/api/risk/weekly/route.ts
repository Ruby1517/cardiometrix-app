import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import RiskDaily from '@/models/RiskDaily';
import { initServer } from '@/index';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function GET(req: NextRequest) {
  initServer();
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const parsed = querySchema.safeParse({ date: req.nextUrl.searchParams.get('date') || undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 422 });
  }

  const asOfDate = parsed.data.date || dayjs().format('YYYY-MM-DD');
  const start = dayjs(asOfDate).subtract(6, 'day').format('YYYY-MM-DD');
  const rows = await RiskDaily.find({ userId: uid, as_of_date: { $gte: start, $lte: asOfDate } })
    .sort({ as_of_date: 1 })
    .lean();

  const numeric = rows
    .map((r) => {
      const risk = (r as { risk?: unknown }).risk;
      return typeof risk === 'number' ? risk : null;
    })
    .filter((v): v is number => v !== null);
  const avgRisk = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
  const maxRisk = numeric.length ? Math.max(...numeric) : null;

  const latest = rows[rows.length - 1] as { risk?: unknown } | undefined;
  const prev = rows.length >= 2 ? (rows[rows.length - 2] as { risk?: unknown }) : null;
  const diff = typeof latest?.risk === 'number' && typeof prev?.risk === 'number' ? latest.risk - prev.risk : 0;
  const trend = diff > 0.03 ? 'worsening' : diff < -0.03 ? 'improving' : 'stable';

  return NextResponse.json({
    records: rows,
    stats: {
      avgRisk,
      maxRisk,
      count: rows.length,
      trend,
    },
    summary: {
      weekStart: start,
      weekEnd: asOfDate,
      summaryText:
        avgRisk === null
          ? 'Risk unavailable this week. Add more vitals to generate risk trends.'
          : `Average 7-day risk ${avgRisk.toFixed(2)} with ${trend} trend.`,
      explanations:
        avgRisk === null
          ? ['No recent risk records available.']
          : [
              `Average risk score over 7 days: ${avgRisk.toFixed(2)}.`,
              `Maximum risk score over 7 days: ${maxRisk?.toFixed(2)}.`,
            ],
      signals: {
        trend,
        deteriorationDetected: trend === 'worsening',
      },
      metrics: {
        risk_score_avg_7d: avgRisk,
        risk_score_slope_14d: diff,
      },
    },
  });
}
