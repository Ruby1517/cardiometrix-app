import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import dayjs from 'dayjs';
import Nudge from '@/models/Nudge';


export async function GET(req: NextRequest) {
await dbConnect();
const auth = await requireAuth(req); if ('error' in auth) return auth.error;
const { uid } = auth.claims!;
const date = dayjs().format('YYYY-MM-DD');
const nudge = await Nudge.findOne({ userId: uid, date }).lean();
return NextResponse.json({ nudge });
}