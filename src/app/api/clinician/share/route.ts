import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import ClinicianShare from '@/models/ClinicianShare';
import crypto from 'crypto';
import RiskScore from '@/models/RiskScore';
import DailyFeature from '@/models/DailyFeature';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = requireAuth(req); if ('error' in auth) return auth.error;
  const forbidden = requireRole(auth.claims!, ['patient','clinician','admin']); if (forbidden) return forbidden; // any role can share own data
  const { uid } = auth.claims!;
  const token = crypto.randomBytes(24).toString('hex');
  const ttlDays = Number(process.env.SHARE_TOKEN_TTL_DAYS || 14);
  const expiresAt = new Date(Date.now() + ttlDays*86400000);
  const share = await ClinicianShare.create({ userId: uid, token, expiresAt });
  const url = `${process.env.APP_URL}/api/clinician/report?token=${token}`;
  return NextResponse.json({ url, expiresAt });
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const share = await ClinicianShare.findOne({ token }).lean();
  if (!share || (share.expiresAt && share.expiresAt.getTime() < Date.now())) return NextResponse.json({ error: 'Expired' }, { status: 410 });

  const date = new Date();
  const ymd = new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,10);

  const risk = await RiskScore.findOne({ userId: share.userId, date: ymd }).lean();
  const feats = await DailyFeature.findOne({ userId: share.userId, date: ymd }).lean();

  return NextResponse.json({
    patientId: String(share.userId),
    asOf: ymd,
    risk,
    features: feats?.features,
    notes: 'Wellness decision-support summary; not for diagnosis.'
  });
}