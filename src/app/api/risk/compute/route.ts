import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import dayjs from 'dayjs';
import { computeRisk } from '@/engines/riskEngine';


export async function POST(req: NextRequest) {
await dbConnect();
const auth = requireAuth(req); if ('error' in auth) return auth.error;
const { uid } = auth.claims!;
const today = dayjs().format('YYYY-MM-DD');
const doc = await computeRisk(uid, today, 30);
return NextResponse.json({ ok: true, doc });
}