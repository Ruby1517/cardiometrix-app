import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyJwt } from '@/lib/auth';

export function requireAuth(req: NextRequest) {
  const token = getTokenFromRequest();
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  try { return { claims: verifyJwt(token) }; }
  catch { return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } }
}