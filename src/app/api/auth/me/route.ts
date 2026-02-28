import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { getTokenFromRequest, verifyJwt } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  await dbConnect();
  const token = await getTokenFromRequest();
  if (!token) return NextResponse.json({ user: null });
  try {
    const claims = verifyJwt(token);
    const user = await User.findById(claims.uid).select('_id name email role').lean();
    return NextResponse.json({ user: user ? { id: user._id, name: user.name, email: user.email, role: user.role } : null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
