import User from '@/models/User';
import UserSettings from '@/models/UserSettings';
import { computeAndStoreDailyRiskAndNudge } from '@/lib/riskOrchestrator';
import { dateISOInTimezone, resolveTimezone } from '@/lib/time';

type UserRow = { _id: unknown };

type SettingsRow = { userId: unknown; timezone?: string };

export type DailyScoreJobResult = {
  total: number;
  succeeded: number;
  failed: number;
  rows: Array<{ userId: string; as_of_date: string; ok: boolean; error?: string }>;
};

export type DailyScoreJobDeps = {
  fetchUsers: () => Promise<UserRow[]>;
  fetchSettings: (userIds: string[]) => Promise<SettingsRow[]>;
  computeOne: (userId: string, asOfDate: string) => Promise<void>;
  logger: Pick<Console, 'info' | 'error'>;
};

export async function runDailyScoreJob(options?: {
  dateISO?: string;
  now?: Date;
  deps?: Partial<DailyScoreJobDeps>;
}): Promise<DailyScoreJobResult> {
  const now = options?.now || new Date();

  const deps: DailyScoreJobDeps = {
    fetchUsers: options?.deps?.fetchUsers || (async () => (await User.find({ role: 'patient' }).select('_id').lean()) as unknown as UserRow[]),
    fetchSettings:
      options?.deps?.fetchSettings ||
      (async (userIds: string[]) => {
        if (!userIds.length) return [];
        return (await UserSettings.find({ userId: { $in: userIds } })
          .select('userId timezone')
          .lean()) as unknown as SettingsRow[];
      }),
    computeOne: options?.deps?.computeOne || (async (userId: string, asOfDate: string) => {
      await computeAndStoreDailyRiskAndNudge(userId, asOfDate);
    }),
    logger: options?.deps?.logger || console,
  };

  const users = await deps.fetchUsers();
  const userIds = users.map((row) => String(row._id));
  const settings = await deps.fetchSettings(userIds);
  const timezoneByUser = new Map(settings.map((row) => [String(row.userId), resolveTimezone(row.timezone)]));

  const rows: DailyScoreJobResult['rows'] = [];

  for (const userId of userIds) {
    const timezone = timezoneByUser.get(userId) || resolveTimezone('America/Los_Angeles');
    const asOfDate = options?.dateISO || dateISOInTimezone(timezone, now);

    try {
      await deps.computeOne(userId, asOfDate);
      rows.push({ userId, as_of_date: asOfDate, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      rows.push({ userId, as_of_date: asOfDate, ok: false, error: message });
      deps.logger.error('[dailyScoreJob] failed', { userId, asOfDate, error: message });
    }
  }

  const failed = rows.filter((row) => !row.ok).length;
  const result: DailyScoreJobResult = {
    total: rows.length,
    succeeded: rows.length - failed,
    failed,
    rows,
  };
  deps.logger.info('[dailyScoreJob] complete', { total: result.total, succeeded: result.succeeded, failed: result.failed });
  return result;
}
