import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import {
  findOrCreateGoogleUser,
  getGoogleOAuthConfig,
  hasGoogleOAuthConfig,
  issueUserToken,
  verifyGoogleIdToken,
} from '@/lib/googleAuth';

export async function GET(req: NextRequest) {
  await dbConnect();
  if (!hasGoogleOAuthConfig()) {
    return NextResponse.redirect(new URL('/auth/login?error=google_not_configured', req.nextUrl.origin));
  }
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const nextPath = state ? decodeURIComponent(state) : '/';

  if (!code) {
    return NextResponse.redirect(new URL(`/auth/login?error=google`, req.nextUrl.origin));
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL(`/auth/login?error=google`, req.nextUrl.origin));
  }

  const tokenData = (await tokenRes.json()) as { id_token?: string };
  if (!tokenData.id_token) {
    return NextResponse.redirect(new URL(`/auth/login?error=google`, req.nextUrl.origin));
  }

  const payload = await verifyGoogleIdToken(tokenData.id_token);
  const user = await findOrCreateGoogleUser(payload);
  const token = await issueUserToken(String(user._id), user.role);
  await setAuthCookie(token);

  return NextResponse.redirect(new URL(nextPath, req.nextUrl.origin));
}
