import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import CaregiverInvite from '@/models/CaregiverInvite';
import CaregiverAccess from '@/models/CaregiverAccess';

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const token = String(body?.token || '');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const invite = await CaregiverInvite.findOne({ token }).lean();
  if (!invite) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    await CaregiverInvite.findByIdAndUpdate(invite._id, { status: 'expired' });
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  await CaregiverAccess.findOneAndUpdate(
    { patientId: invite.patientId, caregiverId: uid },
    { patientId: invite.patientId, caregiverId: uid },
    { upsert: true, new: true }
  );

  await CaregiverInvite.findByIdAndUpdate(invite._id, { status: 'accepted' });

  return NextResponse.json({ ok: true, patientId: String(invite.patientId) });
}
