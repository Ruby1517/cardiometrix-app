import dayjs from 'dayjs';
import Measurement from '@/models/Measurement';
import DailyFeature from '@/models/DailyFeature';

function mean(nums: number[]) { return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0; }
function variance(nums: number[]) { const m=mean(nums); return nums.length? nums.reduce((s,x)=>s+(x-m)**2,0)/nums.length : 0 }

export async function computeDailyFeatures(userId: string, dateISO: string) {
  // dateISO: YYYY-MM-DD (local)
  const start = dayjs(dateISO).startOf('day').toDate();
  const end = dayjs(dateISO).endOf('day').toDate();

  const win7Start = dayjs(dateISO).subtract(6, 'day').startOf('day').toDate();
  const win14Start = dayjs(dateISO).subtract(13, 'day').startOf('day').toDate();

  // BP 7d
  const bp7 = await Measurement.find({ userId, type: 'bp', measuredAt: { $gte: win7Start, $lte: end } }).lean();
  const sys = bp7.map((m:any)=>m.payload.systolic).filter(Boolean);
  const dia = bp7.map((m:any)=>m.payload.diastolic).filter(Boolean);

  // HRV 7d
  const hrv7 = await Measurement.find({ userId, type: 'hrv', measuredAt: { $gte: win7Start, $lte: end } }).lean();
  const hrv = hrv7.map((m:any)=>m.payload.rmssd).filter(Boolean);

  // Steps 7d
  const steps7 = await Measurement.find({ userId, type: 'steps', measuredAt: { $gte: win7Start, $lte: end } }).lean();
  const steps = steps7.map((m:any)=>m.payload.count).filter(Boolean);

  // Sleep debt (target 7h)
  const sleep7 = await Measurement.find({ userId, type: 'sleep', measuredAt: { $gte: win7Start, $lte: end } }).lean();
  const sleepHours = sleep7.map((m:any)=>m.payload.hours).filter(Boolean);
  const sleepDebtH = Math.max(0, 7*7 - sleepHours.reduce((a,b)=>a+b,0));

  // Weight 14d trend (kg/day)
  const wt14 = await Measurement.find({ userId, type: 'weight', measuredAt: { $gte: win14Start, $lte: end } }).sort({ measuredAt: 1 }).lean();
  let weightTrend = 0;
  if (wt14.length >= 2) {
    const first = wt14[0];
    const last = wt14[wt14.length-1];
    const days = Math.max(1, (new Date(last.measuredAt).getTime() - new Date(first.measuredAt).getTime())/86400000);
    weightTrend = (last.payload.kg - first.payload.kg) / days; // kg/day
  }

  // Morning-evening BP diff (today)
  const todayBp = await Measurement.find({ userId, type: 'bp', measuredAt: { $gte: start, $lte: end } }).lean();
  const morning = todayBp.filter((m:any)=> new Date(m.measuredAt).getHours() < 12 ).map((m:any)=>m.payload.systolic);
  const evening = todayBp.filter((m:any)=> new Date(m.measuredAt).getHours() >= 12 ).map((m:any)=>m.payload.systolic);
  const morningAvg = mean(morning), eveningAvg = mean(evening);
  const morningEveningDiff = (isFinite(morningAvg) && isFinite(eveningAvg)) ? (eveningAvg - morningAvg) : 0;

  const doc = {
    userId,
    date: dateISO,
    features: {
      bp_sys_avg_7d: mean(sys),
      bp_dia_var_7d: variance(dia),
      hrv_avg_7d: mean(hrv),
      steps_avg_7d: mean(steps),
      sleep_debt_h: sleepDebtH,
      weight_trend_14d: weightTrend,
      morning_evening_bp_diff: morningEveningDiff
    }
  };
  await DailyFeature.findOneAndUpdate({ userId, date: dateISO }, doc, { upsert: true, new: true });
  return doc;
}