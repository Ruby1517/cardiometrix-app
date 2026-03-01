import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_TTL_DAYS = Number(process.env.TOKEN_TTL_DAYS || 7);

export type JwtClaims = { uid: string; role: 'patient'|'clinician'|'admin' };

export function signJwt(claims: JwtClaims) {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
}

export function verifyJwt(token: string): JwtClaims {
  return jwt.verify(token, JWT_SECRET) as JwtClaims;
}

export async function getTokenFromRequest(req?: NextRequest): Promise<string | null> {
  if (!req) return null;
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}
