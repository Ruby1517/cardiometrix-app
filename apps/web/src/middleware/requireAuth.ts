import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyJwt } from '@/lib/auth';

export async function requireAuth(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  try { return { claims: verifyJwt(token) }; }
  catch { return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } }
}
