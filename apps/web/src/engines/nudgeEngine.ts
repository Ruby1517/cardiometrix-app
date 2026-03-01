import Nudge from '@/models/Nudge';
import RiskScore from '@/models/RiskScore';
import DailyFeature from '@/models/DailyFeature';
import NudgeEffectiveness from '@/models/NudgeEffectiveness';
import dayjs from 'dayjs';

// Get effectiveness score for a category (0-1, higher = better)
async function getCategoryEffectiveness(userId: string, category: string): Promise<number> {
  const eff = await NudgeEffectiveness.findOne({ userId, category }).lean();
  if (!eff) return 0.5; // neutral if no data
  
  const total = (eff as any).completed + (eff as any).skipped;
  if (total === 0) return 0.5;
  
  const completionRate = (eff as any).completed / total;
  const improvementRate = (eff as any).completed > 0 
    ? (eff as any).riskImproved / (eff as any).completed 
    : 0;
  
  // Weight completion rate 40% and improvement rate 60%
  return completionRate * 0.4 + improvementRate * 0.6;
}

export async function upsertDailyNudge(userId: string, dateISO: string) {
  const risk = await RiskScore.findOne({ userId, date: dateISO }).lean();
  const df = await DailyFeature.findOne({ userId, date: dateISO }).lean();

  if (!risk || !df) throw new Error('Need risk and features');

  const f = df.features as any;

  if ((risk as any).band === 'green') {
    const doc = {
      userId,
      date: dateISO,
      message: 'Everything looks stable. Keep your routine.',
      category: 'custom',
      rationale: 'Low risk today.'
    };
    await Nudge.findOneAndUpdate({ userId, date: dateISO }, doc, { upsert: true, new: true });
    return doc;
  }
  
  // Build candidate nudges based on top drivers
  type Candidate = { message: string; category: string; rationale: string; priority: number };
  const candidates: Candidate[] = [];

  if (risk.band !== 'green') {
    const top = (risk.drivers||[])[0];
    
    if (top?.feature === 'sys') {
      candidates.push({
        message: 'Choose low-sodium options today (skip canned soups, cured meats).',
        category: 'salt',
        rationale: 'Elevated BP driver — salt reduction helps.',
        priority: 1
      });
    }
    if (top?.feature === 'steps' || (f as any).steps_avg_7d < 6000) {
      candidates.push({
        message: 'Add a 12-min brisk walk after lunch.',
        category: 'steps',
        rationale: 'Low activity driver.',
        priority: 1
      });
    }
    if (top?.feature === 'sleepDebt' || (f as any).sleep_debt_h > 5) {
      candidates.push({
        message: 'Aim for lights-out 30 min earlier tonight.',
        category: 'sleep',
        rationale: 'Sleep debt driver.',
        priority: 1
      });
    }
    if (top?.feature === 'hrv' || (f as any).hrv_avg_7d < 50) {
      candidates.push({
        message: 'Try 5 min of slow breathing (4s in / 6s out).',
        category: 'sleep',
        rationale: 'Low HRV driver.',
        priority: 1
      });
    }
  }

  // Default nudge
  candidates.push({
    message: 'Take a 10–15 min easy walk today.',
    category: 'steps',
    rationale: 'General activity supports cardiometabolic health.',
    priority: 0
  });

  // Score candidates by historical effectiveness
  let bestCandidate = candidates[0];
  let bestScore = 0;

  for (const candidate of candidates) {
    const effectiveness = await getCategoryEffectiveness(userId, candidate.category);
    const score = candidate.priority * 10 + effectiveness * 5; // priority matters more, but effectiveness adjusts
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  const doc = { userId, date: dateISO, message: bestCandidate.message, category: bestCandidate.category, rationale: bestCandidate.rationale };
  await Nudge.findOneAndUpdate({ userId, date: dateISO }, doc, { upsert: true, new: true });
  return doc;
}

// Track nudge effectiveness after completion
export async function trackNudgeEffectiveness(userId: string, nudgeId: string, status: 'completed' | 'skipped') {
  const nudge = await Nudge.findById(nudgeId).lean();
  if (!nudge) return;

  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  await NudgeEffectiveness.findOneAndUpdate(
    { userId, category: (nudge as any).category },
    {
      $inc: {
        [status === 'completed' ? 'completed' : 'skipped']: 1
      },
      $set: { lastUpdated: new Date() }
    },
    { upsert: true }
  );

  // If completed, check if risk improved
  if (status === 'completed') {
    const riskBefore = await RiskScore.findOne({ userId, date: yesterday }).lean();
    const riskAfter = await RiskScore.findOne({ userId, date: today }).lean();
    
    if (riskBefore && riskAfter) {
      const improved = (riskAfter as any).score < (riskBefore as any).score;
      const worsened = (riskAfter as any).score > (riskBefore as any).score;
      
      if (improved || worsened) {
        await NudgeEffectiveness.findOneAndUpdate(
          { userId, category: (nudge as any).category },
          {
            $inc: {
              [improved ? 'riskImproved' : 'riskWorsened']: 1
            }
          },
          { upsert: true }
        );
      }
    }
  }
}
