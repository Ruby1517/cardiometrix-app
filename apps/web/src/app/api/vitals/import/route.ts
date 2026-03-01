import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Measurement from '@/models/Measurement';

const importEntrySchema = z
  .object({
    systolic: z.number().positive().optional(),
    diastolic: z.number().positive().optional(),
    pulse: z.number().positive().optional(),
    weight: z.number().positive().optional(),
    steps: z.number().nonnegative().optional(),
    sleepMinutes: z.number().nonnegative().optional(),
    hr: z.number().positive().optional(),
    hrv: z.number().positive().optional(),
    measuredAt: z.string().datetime().optional(),
    source: z.string().min(1).max(64).optional(),
  })
  .superRefine((value, ctx) => {
    const hasAny =
      value.weight !== undefined ||
      value.steps !== undefined ||
      value.sleepMinutes !== undefined ||
      value.hr !== undefined ||
      value.hrv !== undefined ||
      (value.systolic !== undefined && value.diastolic !== undefined);
    if (!hasAny) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Entry has no supported measurements.' });
    }
  });

const bodySchema = z.object({
  entries: z.array(importEntrySchema).min(1).max(2000),
});

type ImportEntry = z.infer<typeof importEntrySchema>;

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid import payload.', detail: parsed.error.flatten() }, { status: 422 });
  }

  const tasks: Promise<unknown>[] = [];

  const createDoc = (entry: ImportEntry, type: string, payload: Record<string, number>) => {
    const measuredAt = entry.measuredAt ? new Date(entry.measuredAt) : new Date();
    const source = entry.source || 'import';
    tasks.push(
      Measurement.create({
        userId: uid,
        type,
        measuredAt,
        source,
        payload,
      }),
    );
  };

  for (const entry of parsed.data.entries) {
    if (entry.systolic !== undefined && entry.diastolic !== undefined) {
      createDoc(entry, 'bp', {
        systolic: Number(entry.systolic),
        diastolic: Number(entry.diastolic),
        ...(entry.pulse !== undefined ? { pulse: Number(entry.pulse) } : {}),
      });
    }
    if (entry.weight !== undefined) createDoc(entry, 'weight', { kg: Number(entry.weight) });
    if (entry.steps !== undefined) createDoc(entry, 'steps', { count: Number(entry.steps) });
    if (entry.sleepMinutes !== undefined) createDoc(entry, 'sleep', { minutes: Number(entry.sleepMinutes) });
    if (entry.hr !== undefined) createDoc(entry, 'hr', { bpm: Number(entry.hr) });
    if (entry.hrv !== undefined) createDoc(entry, 'hrv', { rmssd: Number(entry.hrv) });
  }

  await Promise.all(tasks);
  return NextResponse.json({ ok: true, imported: tasks.length });
}
