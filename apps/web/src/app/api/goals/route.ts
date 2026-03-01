import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Goal from '@/models/Goal';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const goal = await Goal.findOne({ userId: uid }).lean();
  if (!goal) {
    return NextResponse.json({ goal: null });
  }

  return NextResponse.json({
    goal: {
      id: String(goal._id),
      bpSystolicTarget: goal.bpSystolicTarget ?? null,
      bpDiastolicTarget: goal.bpDiastolicTarget ?? null,
      weightTargetKg: goal.weightTargetKg ?? null,
      updatedAt: goal.updatedAt,
    },
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const bpSystolicTarget =
    body?.bpSystolicTarget !== undefined ? Number(body.bpSystolicTarget) : undefined;
  const bpDiastolicTarget =
    body?.bpDiastolicTarget !== undefined ? Number(body.bpDiastolicTarget) : undefined;
  const weightTargetKg = body?.weightTargetKg !== undefined ? Number(body.weightTargetKg) : undefined;

  const update: Record<string, number | null> = {};
  if (Number.isFinite(bpSystolicTarget)) update.bpSystolicTarget = bpSystolicTarget;
  if (Number.isFinite(bpDiastolicTarget)) update.bpDiastolicTarget = bpDiastolicTarget;
  if (Number.isFinite(weightTargetKg)) update.weightTargetKg = weightTargetKg;

  const goal = await Goal.findOneAndUpdate(
    { userId: uid },
    { $set: update, $setOnInsert: { userId: uid } },
    { new: true, upsert: true }
  ).lean();

  return NextResponse.json({
    goal: {
      id: String(goal._id),
      bpSystolicTarget: goal.bpSystolicTarget ?? null,
      bpDiastolicTarget: goal.bpDiastolicTarget ?? null,
      weightTargetKg: goal.weightTargetKg ?? null,
      updatedAt: goal.updatedAt,
    },
  });
}
