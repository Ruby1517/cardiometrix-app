import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/crypto';
import { zRegister } from '@/lib/z';
import { signJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await dbConnect();
  const json = await req.json();
  const data = zRegister.parse(json);
  const exists = await User.findOne({ email: data.email });
  if (exists) return NextResponse.json({ error: 'Email in use' }, { status: 400 });
  const passwordHash = await hashPassword(data.password);
  const user = await User.create({ name: data.name, email: data.email, passwordHash, role: data.role });
  const token = signJwt({ uid: String(user._id), role: user.role });
  return NextResponse.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}
