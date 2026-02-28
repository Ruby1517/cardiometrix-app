import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import NudgeEffectiveness from '@/models/NudgeEffectiveness';
import Nudge from '@/models/Nudge';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  // Get effectiveness data for all categories
  const effectiveness = await NudgeEffectiveness.find({ userId: uid }).lean();

  // Get recent nudge history
  const last30Days = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
  const nudges = await Nudge.find({
    userId: uid,
    date: { $gte: last30Days }
  }).sort({ date: -1 }).lean();

  const categoryStats = effectiveness.map((eff: any) => {
    const total = (eff as any).completed + (eff as any).skipped;
    const completionRate = total > 0 ? ((eff as any).completed / total) * 100 : 0;
    const improvementRate = (eff as any).completed > 0 
      ? ((eff as any).riskImproved / (eff as any).completed) * 100 
      : 0;
    const effectivenessScore = completionRate * 0.4 + improvementRate * 0.6;

    return {
      category: (eff as any).category,
      completed: (eff as any).completed,
      skipped: (eff as any).skipped,
      riskImproved: (eff as any).riskImproved,
      riskWorsened: (eff as any).riskWorsened,
      completionRate: Math.round(completionRate),
      improvementRate: Math.round(improvementRate),
      effectivenessScore: Math.round(effectivenessScore),
      totalAttempts: total,
    };
  }).sort((a, b) => b.effectivenessScore - a.effectivenessScore);

  const recentNudges = nudges.map((n: any) => ({
    date: (n as any).date,
    message: (n as any).message,
    category: (n as any).category,
    status: (n as any).status,
  }));

  return NextResponse.json({
    categoryStats,
    recentNudges,
    summary: {
      totalCategories: categoryStats.length,
      bestCategory: categoryStats[0]?.category || null,
      overallCompletionRate: nudges.length > 0
        ? Math.round((nudges.filter((n: any) => (n as any).status === 'completed').length / nudges.length) * 100)
        : 0,
    },
  });
}





