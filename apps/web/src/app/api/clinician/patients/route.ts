import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import User from '@/models/User';
import RiskScore from '@/models/RiskScore';
import Nudge from '@/models/Nudge';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  
  const forbidden = requireRole(auth.claims!, ['clinician', 'admin']);
  if (forbidden) return forbidden;

  const today = dayjs().format('YYYY-MM-DD');
  const last30Days = dayjs().subtract(30, 'days').format('YYYY-MM-DD');

  // Get all patients
  const patients = await User.find({ role: 'patient' }).lean();

  const rows = await Promise.all(
    patients.map(async (p: any) => {
      const userId = String(p._id);
      
      // Get latest risk score
      const risk = await RiskScore.findOne({ userId, date: today }).lean();
      
      // Get adherence
      const nudges = await Nudge.find({
        userId,
        date: { $gte: last30Days }
      }).lean();
      
      const totalNudges = nudges.length;
      const completedNudges = nudges.filter(n => n.status === 'completed').length;
      const adherence = totalNudges > 0 
        ? Math.round((completedNudges / totalNudges) * 100)
        : null;

      // Get trend (compare today vs 7 days ago)
      const weekAgo = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
      const riskWeekAgo = await RiskScore.findOne({ userId, date: weekAgo }).lean();
      
      let trend: 'improving' | 'stable' | 'worsening' | null = null;
      if (risk && riskWeekAgo) {
        const diff = (risk as any).score - (riskWeekAgo as any).score;
        if (diff < -0.05) trend = 'improving';
        else if (diff > 0.05) trend = 'worsening';
        else trend = 'stable';
      }

      return {
        id: userId,
        name: p.name,
        email: p.email,
        risk: risk ? (risk as any).band : null,
        score: risk ? (risk as any).score : null,
        date: risk ? today : null,
        adherence,
        trend,
      };
    })
  );

  return NextResponse.json({ rows });
}





