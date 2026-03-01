import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';

function toDay(ts: Date | string) {
  return dayjs(ts).format('YYYY-MM-DD');
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const end = dayjs().endOf('day').toDate();
  const start7 = dayjs().subtract(6, 'day').startOf('day').toDate();
  const start30 = dayjs().subtract(29, 'day').startOf('day').toDate();

  const [weekRows, bpRows, weightRows, importedRows] = await Promise.all([
    Measurement.find({
      userId: uid,
      measuredAt: { $gte: start7, $lte: end },
      type: { $in: ['sleep', 'steps'] },
    })
      .select('type measuredAt')
      .lean(),
    Measurement.find({ userId: uid, measuredAt: { $gte: start7, $lte: end }, type: 'bp' }).select('measuredAt').lean(),
    Measurement.find({ userId: uid, measuredAt: { $gte: start7, $lte: end }, type: 'weight' }).select('measuredAt').lean(),
    Measurement.find({
      userId: uid,
      measuredAt: { $gte: start30, $lte: end },
      source: { $in: ['apple_health', 'google_fit', 'health_connect'] },
    })
      .select('source measuredAt type')
      .sort({ measuredAt: -1 })
      .lean(),
  ]);

  const sleepDays = new Set(
    weekRows
      .filter((r) => (r as { type?: string }).type === 'sleep')
      .map((r) => toDay((r as { measuredAt: Date }).measuredAt)),
  ).size;
  const stepsDays = new Set(
    weekRows
      .filter((r) => (r as { type?: string }).type === 'steps')
      .map((r) => toDay((r as { measuredAt: Date }).measuredAt)),
  ).size;

  const latestBySource: Record<string, string | null> = {
    apple_health: null,
    google_fit: null,
    health_connect: null,
  };

  for (const row of importedRows) {
    const source = String((row as { source?: string }).source || '');
    if (!(source in latestBySource)) continue;
    if (!latestBySource[source]) {
      latestBySource[source] = dayjs((row as { measuredAt: Date }).measuredAt).toISOString();
    }
  }

  return NextResponse.json({
    windowDays: 7,
    metrics: {
      sleepDaysWithData: sleepDays,
      stepsDaysWithData: stepsDays,
      bpReadingsThisWeek: bpRows.length,
      weightReadingsThisWeek: weightRows.length,
    },
    sources: {
      apple_health: { linked: latestBySource.apple_health !== null, lastSyncAt: latestBySource.apple_health },
      google_fit: { linked: latestBySource.google_fit !== null, lastSyncAt: latestBySource.google_fit },
      health_connect: { linked: latestBySource.health_connect !== null, lastSyncAt: latestBySource.health_connect },
    },
  });
}
