import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { computeRiskForecast } from '@/engines/riskForecastEngine';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const horizonsParam = searchParams.get('horizons');
  const horizons = horizonsParam
    ? horizonsParam
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [30, 60, 90];

  const forecast = await computeRiskForecast(uid, horizons);
  return NextResponse.json({ forecast });
}
