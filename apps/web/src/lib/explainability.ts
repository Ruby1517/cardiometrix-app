type Driver = {
  name?: unknown;
  value?: unknown;
  direction?: unknown;
  contribution?: unknown;
};

type FeatureSnapshot = Record<string, unknown>;

type RiskDocLike = {
  drivers?: Driver[];
  featureSnapshot?: FeatureSnapshot;
};

export type ExplainabilityOut = {
  drivers: Array<{
    name: string;
    value: number;
    direction: 'up' | 'down';
    contribution: number;
  }>;
  changes: string[];
};

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toTitle(name: string) {
  if (!name) return 'Driver';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeDrivers(input: Driver[] = []) {
  return input
    .map((driver) => ({
      name: toTitle(typeof driver.name === 'string' ? driver.name : 'driver'),
      value: asNumber(driver.value),
      direction: driver.direction === 'down' ? 'down' : 'up',
      contribution: asNumber(driver.contribution),
    }))
    .filter((driver) => Math.abs(driver.contribution) > 0.0001)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 4);
}

function buildChanges(snapshot: FeatureSnapshot | undefined) {
  if (!snapshot) return [];

  const changes: Array<{ priority: number; text: string }> = [];

  const sleepDebt = asNumber(snapshot.sleep_debt_hours_7d);
  if (sleepDebt >= 0.75) {
    changes.push({
      priority: sleepDebt,
      text: `Sleep debt is elevated (+${sleepDebt.toFixed(1)}h/night vs target).`,
    });
  }

  const stepsZ = asNumber(snapshot.steps_z_7d);
  if (stepsZ <= -0.5) {
    changes.push({
      priority: Math.abs(stepsZ),
      text: `Movement is down vs your baseline (steps z=${stepsZ.toFixed(2)}).`,
    });
  }

  const bpTrend = asNumber(snapshot.bp_sys_trend_14d);
  if (bpTrend >= 0.2) {
    changes.push({
      priority: bpTrend,
      text: `Systolic BP is trending up (+${bpTrend.toFixed(2)} mmHg/day).`,
    });
  }

  const bpVar = asNumber(snapshot.bp_sys_var_7d);
  if (bpVar >= 6) {
    changes.push({
      priority: bpVar / 10,
      text: `Blood pressure variability is higher this week (SD ${bpVar.toFixed(1)}).`,
    });
  }

  const hrvZ = asNumber(snapshot.hrv_z_7d);
  if (hrvZ <= -0.5) {
    changes.push({
      priority: Math.abs(hrvZ),
      text: `HRV is below baseline (z=${hrvZ.toFixed(2)}).`,
    });
  }

  const rhrZ = asNumber(snapshot.rhr_z_7d);
  if (rhrZ >= 0.5) {
    changes.push({
      priority: rhrZ,
      text: `Resting heart rate is above baseline (z=${rhrZ.toFixed(2)}).`,
    });
  }

  const weightTrend = asNumber(snapshot.weight_trend_14d);
  if (weightTrend >= 0.03) {
    changes.push({
      priority: weightTrend * 5,
      text: `Weight trend increased (+${weightTrend.toFixed(2)} kg/day).`,
    });
  }

  const glucoseTrend = asNumber(snapshot.glucose_trend_14d);
  if (glucoseTrend >= 0.5) {
    changes.push({
      priority: glucoseTrend / 3,
      text: `Glucose trend is rising (+${glucoseTrend.toFixed(2)} mg/dL/day).`,
    });
  }

  return changes
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
    .map((item) => item.text);
}

export function buildRiskExplainability(doc: RiskDocLike | null | undefined): ExplainabilityOut {
  if (!doc) {
    return { drivers: [], changes: [] };
  }

  return {
    drivers: normalizeDrivers(doc.drivers || []),
    changes: buildChanges(doc.featureSnapshot),
  };
}
