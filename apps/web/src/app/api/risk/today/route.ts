import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import RiskDaily from '@/models/RiskDaily';
import UserSettings from '@/models/UserSettings';
import { dateISOInTimezone, resolveTimezone } from '@/lib/time';
import { buildRiskExplainability } from '@/lib/explainability';

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  const { uid } = auth.claims!;
  const parsed = querySchema.safeParse({ date: req.nextUrl.searchParams.get('date') || undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 422 });
  }

  const settings = (await UserSettings.findOne({ userId: uid }).select('timezone').lean()) as { timezone?: string } | null;
  const timezone = resolveTimezone(settings?.timezone || 'America/Los_Angeles');
  const asOfDate = parsed.data.date || dateISOInTimezone(timezone);
  const today = await RiskDaily.findOne({ userId: uid, as_of_date: asOfDate }).lean();

  if (!today) {
    return NextResponse.json({
      today: {
        as_of_date: asOfDate,
        risk: null,
        band: 'unknown',
        drivers: [],
        explainability: {
          drivers: [],
          changes: [],
        },
        model_version: 'risk_unavailable',
      },
    });
  }

  return NextResponse.json({
    today: {
      ...(today as Record<string, unknown>),
      explainability: buildRiskExplainability(today as { drivers?: Array<Record<string, unknown>>; featureSnapshot?: Record<string, unknown> }),
    },
  });
}
