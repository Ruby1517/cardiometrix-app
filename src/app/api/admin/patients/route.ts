import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import User from '@/models/User';
import RiskScore from '@/models/RiskScore';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  
  const forbidden = requireRole(auth.claims!, ['admin']);
  if (forbidden) return forbidden;

  const today = dayjs().format('YYYY-MM-DD');

  const patients = await User.find({ role: 'patient' }).lean();

  const rows = await Promise.all(
    patients.map(async (p: any) => {
      const userId = String(p._id);
      const risk = await RiskScore.findOne({ userId, date: today }).lean();

      return {
        id: userId,
        name: p.name,
        email: p.email,
        risk: risk ? (risk as any).band : null,
        score: risk ? (risk as any).score : null,
        date: risk ? today : null,
      };
    })
  );

  return NextResponse.json({ rows });
}





