import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('cmx_token', '', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', expires: new Date(0) });
  return res;
}