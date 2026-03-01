import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { computeDataQuality } from '@/engines/dataQualityEngine';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const windowDays = Number(searchParams.get('window') || 7);
  const quality = await computeDataQuality(uid, windowDays);

  return NextResponse.json({ quality });
}
