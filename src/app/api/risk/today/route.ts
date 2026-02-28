import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import dayjs from 'dayjs';
import RiskScore from '@/models/RiskScore';


export async function GET(req: NextRequest) {
await dbConnect();
const auth = await requireAuth(req); if ('error' in auth) return auth.error;
const { uid } = auth.claims!;
const today = dayjs().format('YYYY-MM-DD');
const doc = await RiskScore.findOne({ userId: uid, date: today, horizonDays: 30 }).lean();
return NextResponse.json({ today: doc });
}