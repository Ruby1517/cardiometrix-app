import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { apiPost } from '../api/http';

type QueueItem = {
  id: number;
  type: 'vitals' | 'symptoms';
  payload: string;
  status: 'pending' | 'failed';
  createdAt: number;
  error?: string | null;
};

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    if (typeof SQLite.openDatabaseAsync === 'function') {
      dbPromise = SQLite.openDatabaseAsync('cmx_offline.db');
    } else if (typeof SQLite.openDatabaseSync === 'function') {
      dbPromise = Promise.resolve(SQLite.openDatabaseSync('cmx_offline.db'));
    } else {
      throw new Error('SQLite is unavailable. Rebuild the app with expo-sqlite installed.');
    }
  }
  return dbPromise;
}

export async function initOfflineQueue() {
  const db = await getDb();
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS pending_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      error TEXT
    );`
  );
}

export async function enqueueItem(type: QueueItem['type'], payload: unknown) {
  const db = await getDb();
  const createdAt = Date.now();
  const payloadText = JSON.stringify(payload);
  await db.runAsync(
    'INSERT INTO pending_queue (type, payload, status, createdAt) VALUES (?, ?, ?, ?);',
    type,
    payloadText,
    'pending',
    createdAt
  );
}

export async function getQueueSummary(type: QueueItem['type']) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ status: string; count: number }>(
    'SELECT status, COUNT(*) as count FROM pending_queue WHERE type = ? GROUP BY status;',
    type
  );
  let pending = 0;
  let failed = 0;
  rows.forEach((row) => {
    if (row.status === 'pending') pending = row.count;
    if (row.status === 'failed') failed = row.count;
  });
  return { pending, failed };
}

async function fetchQueueItems(statuses: QueueItem['status'][]): Promise<QueueItem[]> {
  const db = await getDb();
  const placeholders = statuses.map(() => '?').join(',');
  return db.getAllAsync<QueueItem>(
    `SELECT * FROM pending_queue WHERE status IN (${placeholders}) ORDER BY createdAt ASC;`,
    ...statuses
  );
}

async function markFailed(id: number, error: string) {
  const db = await getDb();
  await db.runAsync('UPDATE pending_queue SET status = ?, error = ? WHERE id = ?;', 'failed', error, id);
}

async function deleteItem(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_queue WHERE id = ?;', id);
}

export async function syncPendingQueue() {
  const items = await fetchQueueItems(['pending', 'failed']);
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload);
      if (item.type === 'vitals') {
        await apiPost('/api/vitals', payload);
      } else if (item.type === 'symptoms') {
        await apiPost('/api/symptoms', payload);
      }
      await deleteItem(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      await markFailed(item.id, message);
    }
  }
}
