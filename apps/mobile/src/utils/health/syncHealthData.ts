import { Platform } from 'react-native';
import { importVitals, VitalsCreatePayload } from '../../api/vitals';
import { importAppleHealthVitals } from './appleHealth';
import { importGoogleFitVitals } from './googleFit';

export type HealthProvider = 'apple_health' | 'google_fit' | 'health_connect';

export type SyncStatus = 'success' | 'error' | 'not_supported';

export type SyncOutcome = {
  provider: HealthProvider;
  status: SyncStatus;
  importedCount: number;
  message: string;
};

function dedupeEntries(entries: VitalsCreatePayload[]) {
  const seen = new Set<string>();
  const out: VitalsCreatePayload[] = [];
  for (const entry of entries) {
    const measuredAt = entry.measuredAt || '';
    const key = JSON.stringify({
      measuredAt,
      source: entry.source || '',
      systolic: entry.systolic ?? null,
      diastolic: entry.diastolic ?? null,
      pulse: entry.pulse ?? null,
      weight: entry.weight ?? null,
      steps: entry.steps ?? null,
      sleepMinutes: entry.sleepMinutes ?? null,
      hr: entry.hr ?? null,
      hrv: entry.hrv ?? null,
    });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export async function syncHealthData(days = 30): Promise<SyncOutcome> {
  if (Platform.OS === 'ios') {
    try {
      const entries = dedupeEntries(await importAppleHealthVitals(days));
      if (!entries.length) {
        return {
          provider: 'apple_health',
          status: 'success',
          importedCount: 0,
          message: `Connected to Apple Health. No data found in last ${days} days.`,
        };
      }
      await importVitals(entries);
      return {
        provider: 'apple_health',
        status: 'success',
        importedCount: entries.length,
        message: `Imported ${entries.length} records from Apple Health.`,
      };
    } catch (error) {
      return {
        provider: 'apple_health',
        status: 'error',
        importedCount: 0,
        message: error instanceof Error ? error.message : 'Apple Health sync failed.',
      };
    }
  }

  if (Platform.OS === 'android') {
    try {
      const entries = dedupeEntries(await importGoogleFitVitals(days));
      if (!entries.length) {
        return {
          provider: 'google_fit',
          status: 'success',
          importedCount: 0,
          message: `Connected on Android. No data found in last ${days} days.`,
        };
      }
      await importVitals(entries);
      return {
        provider: 'google_fit',
        status: 'success',
        importedCount: entries.length,
        message: `Imported ${entries.length} records from Android health source.`,
      };
    } catch (error) {
      return {
        provider: 'google_fit',
        status: 'error',
        importedCount: 0,
        message: error instanceof Error ? error.message : 'Android health sync failed.',
      };
    }
  }

  return {
    provider: 'health_connect',
    status: 'not_supported',
    importedCount: 0,
    message: 'Health data sync is not supported on this platform.',
  };
}
