import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { findOrCreateGoogleUser, issueUserToken, verifyGoogleIdToken } from '@/lib/googleAuth';

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json().catch(() => ({}));
  const idToken = body?.idToken as string | undefined;
  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  const payload = await verifyGoogleIdToken(idToken);
  const user = await findOrCreateGoogleUser(payload);
  const token = await issueUserToken(String(user._id), user.role);

  return NextResponse.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}
