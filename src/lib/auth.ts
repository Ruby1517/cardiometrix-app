import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_TTL_DAYS = Number(process.env.TOKEN_TTL_DAYS || 7);

export type JwtClaims = { uid: string; role: 'patient'|'clinician'|'admin' };

export function signJwt(claims: JwtClaims) {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: `${TOKEN_TTL_DAYS}d` });
}

export function verifyJwt(token: string): JwtClaims {
  return jwt.verify(token, JWT_SECRET) as JwtClaims;
}

export function setAuthCookie(token: string) {
  cookies().set('cmx_token', token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
}

export function getTokenFromRequest(): string | null {
  const c = cookies().get('cmx_token');
  return c?.value ?? null;
}