import { NextRequest } from 'next/server';
import { GET as googleCallback } from '@/app/api/auth/google/callback/route';

export async function GET(req: NextRequest) {
  return googleCallback(req);
}
