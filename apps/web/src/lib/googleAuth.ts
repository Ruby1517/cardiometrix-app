import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User from '@/models/User';
import { signJwt } from '@/lib/auth';
import { hashPassword } from '@/lib/crypto';

const oauthClient = new OAuth2Client();

function getGoogleClientIds(): string[] {
  const ids = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID;
  return ids ? ids.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth environment variables');
  }
  return { clientId, clientSecret, redirectUri };
}

export function hasGoogleOAuthConfig() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export async function verifyGoogleIdToken(idToken: string) {
  const clientIds = getGoogleClientIds();
  if (!clientIds.length) {
    throw new Error('Missing GOOGLE_CLIENT_ID(S)');
  }
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: clientIds,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('Google token missing email');
  }
  return payload;
}

export async function findOrCreateGoogleUser(payload: {
  email: string;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  sub?: string | null;
}) {
  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    const fallbackName = payload.name || payload.given_name || email.split('@')[0];
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await hashPassword(randomPassword);
    user = await User.create({
      name: fallbackName,
      email,
      passwordHash,
      role: 'patient',
    });
  }
  return user;
}

export async function issueUserToken(userId: string, role: 'patient' | 'clinician' | 'admin') {
  return signJwt({ uid: userId, role });
}
