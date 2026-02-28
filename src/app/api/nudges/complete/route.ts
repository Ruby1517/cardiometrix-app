import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import dayjs from 'dayjs';
import Nudge from '@/models/Nudge';
import { trackNudgeEffectiveness } from '@/engines/nudgeEngine';


export async function POST(req: NextRequest) {
await dbConnect();
const auth = await requireAuth(req); if ('error' in auth) return auth.error;
const { uid } = auth.claims!;
const { status } = await req.json(); // 'completed' | 'skipped'
const date = dayjs().format('YYYY-MM-DD');
const n = await Nudge.findOneAndUpdate({ userId: uid, date }, { status }, { new: true });
if (n) {
  // Track effectiveness asynchronously (don't await, let it run in background)
  trackNudgeEffectiveness(uid, String(n._id), status).catch(console.error);
}
return NextResponse.json({ ok: true, nudge: n });
}