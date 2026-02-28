import type { VitalsCreatePayload } from '../../api/vitals';

type GoogleFitModule = {
  authorize: (options: any) => Promise<{ success: boolean }>;
  getWeightSamples: (options: any) => Promise<any[]>;
  getBloodPressureSamples?: (options: any) => Promise<any[]>;
  Scopes: Record<string, string>;
};

export async function importGoogleFitVitals(days = 30): Promise<VitalsCreatePayload[]> {
  const GoogleFit = await loadGoogleFit();
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const auth = await GoogleFit.authorize({
    scopes: [
      GoogleFit.Scopes.FITNESS_BODY_READ,
      GoogleFit.Scopes.FITNESS_BLOOD_PRESSURE_READ,
      GoogleFit.Scopes.FITNESS_HEART_RATE_READ,
    ].filter(Boolean),
  });
  if (!auth.success) {
    throw new Error('Google Fit authorization failed.');
  }

  const weightSamples = await GoogleFit.getWeightSamples({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const bpSamples = GoogleFit.getBloodPressureSamples
    ? await GoogleFit.getBloodPressureSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
    : [];

  return [
    ...weightSamples.map((sample) => ({
      weight: sample.value ?? sample.weight,
      measuredAt: sample.startDate ?? sample.date,
      source: 'google_fit',
    })),
    ...bpSamples.map((sample) => ({
      systolic: sample.systolic,
      diastolic: sample.diastolic,
      pulse: sample.pulse,
      measuredAt: sample.startDate ?? sample.date,
      source: 'google_fit',
    })),
  ];
}

async function loadGoogleFit(): Promise<GoogleFitModule> {
  try {
    const mod = await import('react-native-google-fit');
    return (mod.default ?? mod) as GoogleFitModule;
  } catch {
    throw new Error('Google Fit requires a custom dev build (react-native-google-fit).');
  }
}
