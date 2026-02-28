import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthConfig, hasGoogleOAuthConfig } from '@/lib/googleAuth';

export async function GET(req: NextRequest) {
  if (!hasGoogleOAuthConfig()) {
    return NextResponse.redirect(new URL('/auth/login?error=google_not_configured', req.nextUrl.origin));
  }
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const next = req.nextUrl.searchParams.get('next') || '/';
  const state = encodeURIComponent(next);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
