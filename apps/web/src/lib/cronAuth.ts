import { NextRequest, NextResponse } from 'next/server';

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

export function requireCronAuth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { error: NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 }) };
  }

  const bearer = getBearerToken(req);
  const header = req.headers.get('x-cron-secret');
  if (bearer === secret || header === secret) {
    return { ok: true as const };
  }

  return { error: NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 }) };
}
