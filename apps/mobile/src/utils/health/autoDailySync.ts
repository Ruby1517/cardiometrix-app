import * as SecureStore from 'expo-secure-store';
import { syncHealthData } from './syncHealthData';

const LAST_SYNC_KEY = 'cmx_health_last_sync_date';
const SYNC_LOCK_KEY = 'cmx_health_sync_lock';

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function runDailyHealthSyncIfNeeded() {
  const today = dateKey();
  const [lastSyncDate, lock] = await Promise.all([
    SecureStore.getItemAsync(LAST_SYNC_KEY),
    SecureStore.getItemAsync(SYNC_LOCK_KEY),
  ]);

  if (lastSyncDate === today || lock === today) {
    return { skipped: true as const };
  }

  await SecureStore.setItemAsync(SYNC_LOCK_KEY, today);
  try {
    const outcome = await syncHealthData(30);
    if (outcome.status === 'success') {
      await SecureStore.setItemAsync(LAST_SYNC_KEY, today);
    }
    return { skipped: false as const, outcome };
  } finally {
    await SecureStore.deleteItemAsync(SYNC_LOCK_KEY);
  }
}
