import DailyFeature from '@/models/DailyFeature';
import RiskScore from '@/models/RiskScore';

// Driver type
type Driver = { feature: string; contribution: number; direction: 'up'|'down' };

async function externalScore(features: Record<string, number>): Promise<{ score: number; drivers?: Driver[] } | null> {
  const url = process.env.PY_SCORER_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    if (!res.ok) throw new Error('scorer status ' + res.status);
    const js = await res.json();
    if (typeof js.score !== 'number') throw new Error('bad scorer response');
    return { score: js.score, drivers: js.drivers };
  } catch (e) {
    console.error('External scorer error:', e);
    return null;
  }
}

export async function computeRisk(userId: string, dateISO: string, horizonDays = 30) {
  const df = await DailyFeature.findOne({ userId, date: dateISO }).lean();
  if (!df) throw new Error('No daily features for risk');
  const f = (df.features || {}) as Record<string, number>;

  // First try external ML scorer (FastAPI). If not configured or fails, fall back to interpretable heuristic.
  const ext = await externalScore(f);

  let score: number, band: 'green'|'amber'|'red', drivers: Driver[];
  if (ext) {
    score = Math.max(0, Math.min(1, ext.score));
    band = score < 0.33 ? 'green' : score < 0.66 ? 'amber' : 'red';
    drivers = (ext.drivers || []).sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,4);
  } else {
    // ---- Fallback heuristic (same as v0, interpretable) ----
    const z = {
      sys: ((f as any).bp_sys_avg_7d - 120) / 15,            // higher worse
      diaVar: ((f as any).bp_dia_var_7d - 20) / 15,          // higher worse
      hrv: (70 - (f as any).hrv_avg_7d) / 20,                // lower worse
      steps: (8000 - (f as any).steps_avg_7d) / 4000,        // lower worse
      sleepDebt: ((f as any).sleep_debt_h) / 7,              // higher worse
      wtTrend: ((f as any).weight_trend_14d) / 0.1,          // gaining faster worse
      meDiff: ((f as any).morning_evening_bp_diff) / 10      // evening higher worse
    };

    const weights: Record<keyof typeof z, number> = {
      sys: 0.35,
      diaVar: 0.15,
      hrv: 0.15,
      steps: 0.15,
      sleepDebt: 0.1,
      wtTrend: 0.05,
      meDiff: 0.05
    };

    const linear = (Object.keys(z) as (keyof typeof z)[]).reduce((s,k)=> s + (z[k]||0)*(weights[k]||0), 0);
    score = 1/(1+Math.exp(-linear)); // 0..1
    band = score < 0.33 ? 'green' : score < 0.66 ? 'amber' : 'red';

    drivers = (Object.entries(z) as [keyof typeof z, number][]) 
      .map(([k,v]) => ({ feature: String(k), contribution: (v||0)*(weights[k]||0), direction: (v||0) >= 0 ? 'up' : 'down' }))
      .sort((a,b)=> Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0,4);
  }

  const doc = { userId, date: dateISO, horizonDays, score, band, drivers };
  await RiskScore.findOneAndUpdate({ userId, date: dateISO, horizonDays }, doc, { upsert: true, new: true });
  return doc;
}