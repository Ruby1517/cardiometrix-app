import type { NudgeTag } from '@/lib/nudges/nudgeCatalog';
import { nudgeCatalog, type NudgeItem } from '@/lib/nudges/nudgeCatalog';

type Driver = { name?: string; feature?: string; contribution?: number };

function normalize(text: string | undefined) {
  return (text || '').toLowerCase();
}

function pickTagFromDriver(driver: Driver | null | undefined): NudgeTag {
  const name = normalize(driver?.name);
  const feature = normalize(driver?.feature);
  const source = `${name} ${feature}`;

  if (source.includes('sleep')) return 'sleep';
  if (source.includes('step') || source.includes('movement') || source.includes('activity')) return 'movement';
  if (source.includes('weight')) return 'weight';
  if (source.includes('bp') || source.includes('systolic') || source.includes('diastolic') || source.includes('pressure')) {
    return 'sodium';
  }
  if (source.includes('med') || source.includes('adherence')) return 'meds';
  if (source.includes('hrv') || source.includes('hr')) return 'hydration';

  return 'movement';
}

export function pickDailyNudge(params: {
  band: 'green' | 'amber' | 'red' | 'unknown';
  drivers?: Driver[];
  dateISO: string;
}): NudgeItem {
  const top = (params.drivers || []).slice().sort((a, b) => Math.abs((b.contribution || 0)) - Math.abs((a.contribution || 0)))[0];
  const tag = pickTagFromDriver(top);

  let pool = nudgeCatalog.filter((n) => n.tag === tag);
  if (!pool.length) pool = nudgeCatalog.filter((n) => n.tag === 'movement');

  if (params.band === 'red') {
    const lowBurden = pool.filter((n) => n.burden === 1);
    if (lowBurden.length) pool = lowBurden;
  }

  const daySeed = Number(params.dateISO.replace(/-/g, ''));
  const idx = pool.length ? daySeed % pool.length : 0;
  return pool[idx] || nudgeCatalog[0];
}
