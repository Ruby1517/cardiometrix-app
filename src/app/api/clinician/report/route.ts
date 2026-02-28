import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import ClinicianShare from '@/models/ClinicianShare';
import RiskScore from '@/models/RiskScore';
import DailyFeature from '@/models/DailyFeature';
import User from '@/models/User';
import Measurement from '@/models/Measurement';
import Nudge from '@/models/Nudge';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  
  const share = await ClinicianShare.findOne({ token }).lean();
  if (!share || (share.expiresAt && share.expiresAt.getTime() < Date.now())) {
    return NextResponse.json({ error: 'Expired or invalid token' }, { status: 410 });
  }

  const today = dayjs().format('YYYY-MM-DD');
  const last30Days = dayjs().subtract(30, 'days').format('YYYY-MM-DD');

  const user = await User.findById(share.userId).lean();
  const risk = await RiskScore.findOne({ userId: share.userId, date: today }).lean();
  const feats = await DailyFeature.findOne({ userId: share.userId, date: today }).lean();
  
  // Get risk trend
  const riskHistory = await RiskScore.find({ 
    userId: share.userId, 
    date: { $gte: last30Days }
  }).sort({ date: 1 }).lean();

  // Get recent measurements summary
  const recentBp = await Measurement.find({ 
    userId: share.userId, 
    type: 'bp',
    measuredAt: { $gte: dayjs().subtract(14, 'days').toDate() }
  }).sort({ measuredAt: -1 }).limit(10).lean();

  const recentWeight = await Measurement.find({ 
    userId: share.userId, 
    type: 'weight',
    measuredAt: { $gte: dayjs().subtract(30, 'days').toDate() }
  }).sort({ measuredAt: -1 }).lean();

  // Get nudge adherence (last 30 days)
  const nudges = await Nudge.find({ 
    userId: share.userId,
    date: { $gte: last30Days }
  }).sort({ date: -1 }).lean();
  
  const totalNudges = nudges.length;
  const completedNudges = nudges.filter(n => n.status === 'completed').length;
  const adherenceRate = totalNudges > 0 ? (completedNudges / totalNudges) * 100 : 0;

  return NextResponse.json({
    patient: {
      id: String(share.userId),
      name: (user as any)?.name || 'Unknown',
      email: (user as any)?.email || '',
    },
    asOf: today,
    risk: risk ? {
      score: risk.score,
      band: risk.band,
      drivers: risk.drivers || [],
    } : null,
    features: feats?.features || {},
    riskTrend: riskHistory.map((r: any) => ({
      date: r.date,
      score: r.score,
      band: r.band,
    })),
    recentMeasurements: {
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
    adherence: {
      totalNudges,
      completedNudges,
      adherenceRate: Math.round(adherenceRate),
    },
    notes: 'Wellness decision-support summary; not for diagnosis.',
  });
}




