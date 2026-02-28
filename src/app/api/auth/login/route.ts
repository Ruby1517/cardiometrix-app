import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { comparePassword } from '@/lib/crypto';
import { zLogin } from '@/lib/z';
import { signJwt, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await dbConnect();
  const data = zLogin.parse(await req.json());
  const user = await User.findOne({ email: data.email });
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const ok = await comparePassword(data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const token = signJwt({ uid: String(user._id), role: user.role });
  await setAuthCookie(token);
  return NextResponse.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
}
