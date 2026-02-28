import dayjs from 'dayjs';
import RiskDaily from '@/models/RiskDaily';
import DailyNudge from '@/models/DailyNudge';
import RiskScore from '@/models/RiskScore';
import Nudge from '@/models/Nudge';
import User from '@/models/User';
import { computeFeaturesV1 } from '@/lib/featureEngineering/computeFeaturesV1';
import { scoreOne, type RiskScoreOut } from '@/lib/riskServiceClient';
import { pickDailyNudge } from '@/lib/nudges/pickDailyNudge';

export type OrchestratedRiskResult = {
  riskDoc: unknown;
  nudgeDoc: unknown;
};

function asUnknownBandError(error: string | undefined) {
  return {
    risk: null,
    band: 'unknown' as const,
    drivers: [],
    model_version: 'risk_unavailable',
    error,
  };
}

function normalizeDrivers(drivers: Array<Record<string, unknown>> = []) {
  return drivers
    .filter(Boolean)
    .map((d) => ({
      name: d.name ?? d.feature ?? 'driver',
      value: typeof d.value === 'number' ? d.value : 0,
      direction: d.direction === 'down' ? 'down' : 'up',
      contribution: typeof d.contribution === 'number' ? d.contribution : 0,
    }));
}

async function upsertCompatibilityModels(userId: string, asOfDate: string, scored: ReturnType<typeof asUnknownBandError> | RiskScoreOut) {
  await RiskScore.findOneAndUpdate(
    { userId, date: asOfDate, horizonDays: 30 },
    {
      userId,
      date: asOfDate,
      horizonDays: 30,
      score: scored.risk,
      band: scored.band === 'unknown' ? undefined : scored.band,
      drivers: normalizeDrivers(scored.drivers).map((d) => ({ feature: d.name, contribution: d.contribution, direction: d.direction })),
    },
    { upsert: true, new: true },
  );
}

async function upsertNudgeCompatibility(userId: string, asOfDate: string, nudge: { text: string; tag: string; status?: string }) {
  const legacyStatus = nudge.status === 'done' ? 'completed' : nudge.status === 'snoozed' ? 'skipped' : 'sent';
  await Nudge.findOneAndUpdate(
    { userId, date: asOfDate },
    {
      userId,
      date: asOfDate,
      message: nudge.text,
      category: nudge.tag,
      status: legacyStatus,
      rationale: 'orchestrated',
    },
    { upsert: true, new: true },
  );
}

export async function computeAndStoreDailyRiskAndNudge(userId: string, asOfDate = dayjs().format('YYYY-MM-DD')): Promise<OrchestratedRiskResult> {
  const { features, sufficientData } = await computeFeaturesV1(userId, asOfDate);

  const scored = sufficientData
    ? await scoreOne(features).catch(() => asUnknownBandError('risk_service_unavailable'))
    : asUnknownBandError('insufficient_data');

  const riskDoc = await RiskDaily.findOneAndUpdate(
    { userId, as_of_date: asOfDate },
    {
      userId,
      as_of_date: asOfDate,
      risk: scored.risk,
      band: scored.band,
      drivers: normalizeDrivers(scored.drivers),
      model_version: scored.model_version,
      error: 'error' in scored ? scored.error : undefined,
      computedAt: new Date(),
      featureSnapshot: features,
    },
    { upsert: true, new: true },
  );

  const nudgePick = pickDailyNudge({
    band: scored.band,
    drivers: normalizeDrivers(scored.drivers),
    dateISO: asOfDate,
  });

  const nudgeDoc = await DailyNudge.findOneAndUpdate(
    { userId, as_of_date: asOfDate },
    {
      userId,
      as_of_date: asOfDate,
      key: nudgePick.key,
      tag: nudgePick.tag,
      text: nudgePick.text,
      variant: nudgePick.variant,
      status: 'pending',
      createdAt: new Date(),
    },
    { upsert: true, new: true },
  );

  await Promise.all([
    upsertCompatibilityModels(userId, asOfDate, scored),
    upsertNudgeCompatibility(userId, asOfDate, { text: nudgePick.text, tag: nudgePick.tag }),
  ]);

  return { riskDoc, nudgeDoc };
}

export async function recomputeTodayNudge(userId: string, asOfDate = dayjs().format('YYYY-MM-DD')) {
  const riskDoc = (await RiskDaily.findOne({ userId, as_of_date: asOfDate }).lean()) as
    | { band?: 'green' | 'amber' | 'red' | 'unknown'; drivers?: Array<Record<string, unknown>> }
    | null;
  const nudgePick = pickDailyNudge({
    band: riskDoc?.band || 'unknown',
    drivers: riskDoc?.drivers || [],
    dateISO: asOfDate,
  });

  const nudgeDoc = await DailyNudge.findOneAndUpdate(
    { userId, as_of_date: asOfDate },
    {
      userId,
      as_of_date: asOfDate,
      key: nudgePick.key,
      tag: nudgePick.tag,
      text: nudgePick.text,
      variant: nudgePick.variant,
      status: 'pending',
      createdAt: new Date(),
    },
    { upsert: true, new: true },
  );

  await upsertNudgeCompatibility(userId, asOfDate, { text: nudgePick.text, tag: nudgePick.tag, status: 'pending' });
  return nudgeDoc;
}

export async function runDailyRiskForAllUsers(asOfDate = dayjs().format('YYYY-MM-DD')) {
  const users = await User.find({ role: 'patient' }).select('_id').lean();
  const userIds = users.map((u) => String((u as { _id: unknown })._id));

  const results = [] as Array<{ userId: string; ok: boolean; error?: string }>;
  for (const userId of userIds) {
    try {
      await computeAndStoreDailyRiskAndNudge(userId, asOfDate);
      results.push({ userId, ok: true });
    } catch (error) {
      results.push({ userId, ok: false, error: error instanceof Error ? error.message : 'unknown' });
    }
  }
  return results;
}
