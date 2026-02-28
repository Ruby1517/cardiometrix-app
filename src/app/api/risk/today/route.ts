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
  const today = await RiskDaily.findOne({ userId: uid, as_of_date: asOfDate }).lean();

  if (!today) {
    return NextResponse.json({
      today: {
        as_of_date: asOfDate,
        risk: null,
        band: 'unknown',
        drivers: [],
        model_version: 'risk_unavailable',
      },
    });
  }

  return NextResponse.json({ today });
}
