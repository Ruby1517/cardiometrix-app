import Nudge from '@/models/Nudge';
import RiskScore from '@/models/RiskScore';
import DailyFeature from '@/models/DailyFeature';

export async function upsertDailyNudge(userId: string, dateISO: string) {
  const risk = await RiskScore.findOne({ userId, date: dateISO }).lean();
  const df = await DailyFeature.findOne({ userId, date: dateISO }).lean();

  if (!risk || !df) throw new Error('Need risk and features');

  let message = 'Take a 10–15 min easy walk today.';
  let category: any = 'steps';
  let rationale = 'General activity supports cardiometabolic health.';

  const f = df.features as any;
  if (risk.band !== 'green') {
    // pick the top driver and tailor a nudge
    const top = (risk.drivers||[])[0];
    if (top?.feature === 'sys') { message = 'Choose low-sodium options today (skip canned soups, cured meats).'; category = 'salt'; rationale = 'Elevated BP driver — salt reduction helps.'; }
    if (top?.feature === 'steps') { message = 'Add a 12-min brisk walk after lunch.'; category = 'steps'; rationale = 'Low activity driver.'; }
    if (top?.feature === 'sleepDebt') { message = 'Aim for lights-out 30 min earlier tonight.'; category = 'sleep'; rationale = 'Sleep debt driver.'; }
    if (top?.feature === 'hrv') { message = 'Try 5 min of slow breathing (4s in / 6s out).'; category = 'sleep'; rationale = 'Low HRV driver.'; }
  }

  const doc = { userId, date: dateISO, message, category, rationale };
  await Nudge.findOneAndUpdate({ userId, date: dateISO }, doc, { upsert: true, new: true });
  return doc;
}