import type { VitalsCreatePayload } from '../../api/vitals';

type HealthModule = {
  initHealthKit: (permissions: any, callback: (err: string, results: any) => void) => void;
  getWeightSamples: (options: any, callback: (err: string, results: any[]) => void) => void;
  getBloodPressureSamples: (options: any, callback: (err: string, results: any[]) => void) => void;
  Constants: {
    Permissions: Record<string, string>;
  };
};

export async function importAppleHealthVitals(days = 30): Promise<VitalsCreatePayload[]> {
  const HealthKit = await loadAppleHealth();
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await initHealthKit(HealthKit);

  const [weights, bps] = await Promise.all([
    getWeights(HealthKit, startDate, endDate),
    getBloodPressure(HealthKit, startDate, endDate),
  ]);

  return [
    ...weights.map((sample) => ({
      weight: sample.value,
      measuredAt: sample.startDate,
      source: 'apple_health',
    })),
    ...bps.map((sample) => ({
      systolic: sample.systolic,
      diastolic: sample.diastolic,
      pulse: sample.pulse,
      measuredAt: sample.startDate,
      source: 'apple_health',
    })),
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
  const permissions = {
    permissions: {
      read: [
        HealthKit.Constants.Permissions.BloodPressureDiastolic,
        HealthKit.Constants.Permissions.BloodPressureSystolic,
        HealthKit.Constants.Permissions.HeartRate,
        HealthKit.Constants.Permissions.Weight,
      ],
    },
  };

  return new Promise<void>((resolve, reject) => {
    HealthKit.initHealthKit(permissions, (err) => {
      if (err) {
        reject(new Error(err));
        return;
      }
      resolve();
    });
  });
}

function getWeights(HealthKit: HealthModule, startDate: Date, endDate: Date) {
  return new Promise<{ value: number; startDate: string }[]>((resolve, reject) => {
    HealthKit.getWeightSamples(
      { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      (err, results) => {
        if (err) {
          reject(new Error(err));
          return;
        }
        resolve(
          results.map((item) => ({
            value: item.value,
            startDate: item.startDate,
          }))
        );
      }
    );
  });
}

function getBloodPressure(HealthKit: HealthModule, startDate: Date, endDate: Date) {
  return new Promise<{ systolic: number; diastolic: number; pulse?: number; startDate: string }[]>(
    (resolve, reject) => {
      HealthKit.getBloodPressureSamples(
        { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        (err, results) => {
          if (err) {
            reject(new Error(err));
            return;
          }
          resolve(
            results.map((item) => ({
              systolic: item.systolic,
              diastolic: item.diastolic,
              pulse: item.pulse,
              startDate: item.startDate,
            }))
          );
        }
      );
    }
  );
}
