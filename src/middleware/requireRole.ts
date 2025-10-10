import { NextResponse } from 'next/server';
import type { JwtClaims } from '@/lib/auth';

export function requireRole(claims: JwtClaims, roles: Array<JwtClaims['role']>) {
  if (!roles.includes(claims.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}