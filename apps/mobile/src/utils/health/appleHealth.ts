import type { VitalsCreatePayload } from '../../api/vitals';

type Callback<T> = (err: string | null, results: T) => void;

type HealthModule = {
  initHealthKit: (permissions: any, callback: (err: string) => void) => void;
  getWeightSamples?: (options: any, callback: Callback<any[]>) => void;
  getBloodPressureSamples?: (options: any, callback: Callback<any[]>) => void;
  getStepCount?: (options: any, callback: Callback<any[]>) => void;
  getSleepSamples?: (options: any, callback: Callback<any[]>) => void;
  getHeartRateSamples?: (options: any, callback: Callback<any[]>) => void;
  getHeartRateVariabilitySamples?: (options: any, callback: Callback<any[]>) => void;
  Constants: {
    Permissions: Record<string, string>;
  };
};

export async function importAppleHealthVitals(days = 30): Promise<VitalsCreatePayload[]> {
  const HealthKit = await loadAppleHealth();
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await initHealthKit(HealthKit);

  const options = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  const [weights, bps, steps, sleeps, hrs, hrvs] = await Promise.all([
    getByCallback(HealthKit.getWeightSamples, options),
    getByCallback(HealthKit.getBloodPressureSamples, options),
    getByCallback(HealthKit.getStepCount, options),
    getByCallback(HealthKit.getSleepSamples, options),
    getByCallback(HealthKit.getHeartRateSamples, options),
    getByCallback(HealthKit.getHeartRateVariabilitySamples, options),
  ]);

  return [
    ...weights
      .map((sample) => ({
        weight: toNumber(sample.value),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'apple_health',
      }))
      .filter((r) => r.weight !== undefined && r.measuredAt),
    ...bps
      .map((sample) => ({
        systolic: toNumber(sample.systolic),
        diastolic: toNumber(sample.diastolic),
        pulse: toNumber(sample.pulse),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'apple_health',
      }))
      .filter((r) => r.systolic !== undefined && r.diastolic !== undefined && r.measuredAt),
    ...steps
      .map((sample) => ({
        steps: toNumber(sample.value ?? sample.steps),
        measuredAt: toIso(sample.endDate ?? sample.startDate ?? sample.date),
        source: 'apple_health',
      }))
      .filter((r) => r.steps !== undefined && r.measuredAt),
    ...sleeps
      .map((sample) => {
        const raw = toNumber(sample.value ?? sample.duration ?? sample.minutes);
        const sleepMinutes = raw === undefined ? undefined : raw <= 24 ? raw * 60 : raw;
        return {
          sleepMinutes,
          measuredAt: toIso(sample.endDate ?? sample.startDate ?? sample.date),
          source: 'apple_health',
        };
      })
      .filter((r) => r.sleepMinutes !== undefined && r.measuredAt),
    ...hrs
      .map((sample) => ({
        hr: toNumber(sample.value ?? sample.bpm),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'apple_health',
      }))
      .filter((r) => r.hr !== undefined && r.measuredAt),
    ...hrvs
      .map((sample) => ({
        hrv: toNumber(sample.value ?? sample.rmssd),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'apple_health',
      }))
      .filter((r) => r.hrv !== undefined && r.measuredAt),
  ];
}

async function loadAppleHealth(): Promise<HealthModule> {
  try {
    const mod = await import('react-native-health');
    return (mod.default ?? mod) as HealthModule;
  } catch {
    throw new Error('Apple Health requires a custom dev build (react-native-health).');
  }
}

function initHealthKit(HealthKit: HealthModule) {
  const p = HealthKit.Constants.Permissions;
  const read = [
    p.BloodPressureDiastolic,
    p.BloodPressureSystolic,
    p.HeartRate,
    p.Weight,
    p.Steps,
    p.SleepAnalysis,
    p.HeartRateVariability,
  ].filter(Boolean);

  return new Promise<void>((resolve, reject) => {
    HealthKit.initHealthKit({ permissions: { read } }, (err) => {
      if (err) {
        reject(new Error(err));
        return;
      }
      resolve();
    });
  });
}

function getByCallback(fn: ((options: any, callback: Callback<any[]>) => void) | undefined, options: any): Promise<any[]> {
  if (!fn) return Promise.resolve([]);
  return new Promise<any[]>((resolve, reject) => {
    fn(options, (err, results) => {
      if (err) {
        reject(new Error(err));
        return;
      }
      resolve(Array.isArray(results) ? results : []);
    });
  });
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function toIso(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}
