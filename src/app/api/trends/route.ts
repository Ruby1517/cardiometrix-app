import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import RiskScore from '@/models/RiskScore';
import Measurement from '@/models/Measurement';
import Nudge from '@/models/Nudge';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req); 
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const today = dayjs().format('YYYY-MM-DD');
  const last30Days = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
  const last14Days = dayjs().subtract(14, 'days').toDate();

  // Get risk trend
  const riskHistory = await RiskScore.find({ 
    userId: uid, 
    date: { $gte: last30Days }
  }).sort({ date: 1 }).lean();

  // Get recent measurements
  const recentBp = await Measurement.find({ 
    userId: uid, 
    type: 'bp',
    measuredAt: { $gte: last14Days }
  }).sort({ measuredAt: -1 }).limit(14).lean();

  const recentWeight = await Measurement.find({ 
    userId: uid, 
    type: 'weight',
    measuredAt: { $gte: dayjs().subtract(30, 'days').toDate() }
  }).sort({ measuredAt: -1 }).lean();

  // Get nudge adherence
  const nudges = await Nudge.find({ 
    userId: uid,
    date: { $gte: last30Days }
  }).sort({ date: -1 }).lean();
  
  const totalNudges = nudges.length;
  const completedNudges = nudges.filter(n => n.status === 'completed').length;
  const adherenceRate = totalNudges > 0 ? (completedNudges / totalNudges) * 100 : 0;

  return NextResponse.json({
    riskTrend: riskHistory.map((r: any) => ({
      date: r.date,
      score: r.score,
      band: r.band,
    })),
    adherence: {
      totalNudges,
      completedNudges,
      adherenceRate: Math.round(adherenceRate),
    },
    measurements: {
      bp: recentBp.map((m: any) => ({
        date: dayjs(m.measuredAt).format('YYYY-MM-DD'),
        systolic: m.payload.systolic,
        diastolic: m.payload.diastolic,
        pulse: m.payload.pulse,
      })),
      weight: recentWeight.map((m: any) => ({
        date: dayjs(m.measuredAt).format('YYYY-MM-DD'),
        kg: m.payload.kg,
      })),
    },
  });
}





