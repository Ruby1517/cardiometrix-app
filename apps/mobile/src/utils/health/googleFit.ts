import type { VitalsCreatePayload } from '../../api/vitals';

type GoogleFitModule = {
  authorize: (options: any) => Promise<{ success: boolean }>;
  getWeightSamples?: (options: any) => Promise<any[]>;
  getBloodPressureSamples?: (options: any) => Promise<any[]>;
  getDailyStepCountSamples?: (options: any) => Promise<any[]>;
  getHeartRateSamples?: (options: any) => Promise<any[]>;
  getSleepSamples?: (options: any) => Promise<any[]>;
  Scopes: Record<string, string>;
};

export async function importGoogleFitVitals(days = 30): Promise<VitalsCreatePayload[]> {
  const GoogleFit = await loadGoogleFit();
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const scopes = [
    GoogleFit.Scopes?.FITNESS_BODY_READ,
    GoogleFit.Scopes?.FITNESS_BLOOD_PRESSURE_READ,
    GoogleFit.Scopes?.FITNESS_HEART_RATE_READ,
    GoogleFit.Scopes?.FITNESS_ACTIVITY_READ,
    GoogleFit.Scopes?.FITNESS_SLEEP_READ,
  ].filter(Boolean);

  const auth = await GoogleFit.authorize({ scopes });
  if (!auth.success) {
    throw new Error('Google Fit authorization failed.');
  }

  const query = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };

  const [weightSamples, bpSamples, stepSamples, hrSamples, sleepSamples] = await Promise.all([
    GoogleFit.getWeightSamples ? GoogleFit.getWeightSamples(query) : Promise.resolve([]),
    GoogleFit.getBloodPressureSamples ? GoogleFit.getBloodPressureSamples(query) : Promise.resolve([]),
    GoogleFit.getDailyStepCountSamples ? GoogleFit.getDailyStepCountSamples(query) : Promise.resolve([]),
    GoogleFit.getHeartRateSamples ? GoogleFit.getHeartRateSamples(query) : Promise.resolve([]),
    GoogleFit.getSleepSamples ? GoogleFit.getSleepSamples(query) : Promise.resolve([]),
  ]);

  const entries: VitalsCreatePayload[] = [
    ...weightSamples
      .map((sample) => ({
        weight: toNumber(sample.value ?? sample.weight),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'google_fit',
      }))
      .filter((r) => r.weight !== undefined && r.measuredAt),
    ...bpSamples
      .map((sample) => ({
        systolic: toNumber(sample.systolic),
        diastolic: toNumber(sample.diastolic),
        pulse: toNumber(sample.pulse),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'google_fit',
      }))
      .filter((r) => r.systolic !== undefined && r.diastolic !== undefined && r.measuredAt),
    ...hrSamples
      .map((sample) => ({
        hr: toNumber(sample.value ?? sample.bpm),
        measuredAt: toIso(sample.startDate ?? sample.date),
        source: 'google_fit',
      }))
      .filter((r) => r.hr !== undefined && r.measuredAt),
    ...sleepSamples
      .map((sample) => ({
        sleepMinutes: toNumber(sample.minutes ?? sample.value),
        measuredAt: toIso(sample.endDate ?? sample.startDate ?? sample.date),
        source: 'google_fit',
      }))
      .filter((r) => r.sleepMinutes !== undefined && r.measuredAt),
  ];

  for (const daily of stepSamples) {
    const points = Array.isArray(daily.steps) ? daily.steps : [];
    for (const point of points) {
      const entry: VitalsCreatePayload = {
        steps: toNumber(point.value ?? point.steps),
        measuredAt: toIso(point.endDate ?? point.startDate ?? point.date),
        source: 'google_fit',
      };
      if (entry.steps !== undefined && entry.measuredAt) entries.push(entry);
    }
  }

  return entries;
}

async function loadGoogleFit(): Promise<GoogleFitModule> {
  try {
    const mod = await import('react-native-google-fit');
    return (mod.default ?? mod) as unknown as GoogleFitModule;
  } catch {
    throw new Error('Google Fit requires a custom dev build (react-native-google-fit).');
  }
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
