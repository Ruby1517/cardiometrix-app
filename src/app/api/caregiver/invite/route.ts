import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import CaregiverInvite from '@/models/CaregiverInvite';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

  const token = crypto.randomBytes(20).toString('hex');
  const ttlDays = Number(process.env.CAREGIVER_INVITE_TTL_DAYS || 7);
  const expiresAt = new Date(Date.now() + ttlDays * 86400000);

  await CaregiverInvite.create({
    patientId: uid,
    caregiverEmail: email,
    token,
    expiresAt,
  });

  const baseUrl = process.env.APP_URL || (req.headers.get('origin') || 'http://localhost:3000');
  const url = `${baseUrl}/caregiver/accept?token=${token}`;

  return NextResponse.json({ url, expiresAt });
}
