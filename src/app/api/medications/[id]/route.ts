import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import Medication from '@/models/Medication';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const body = await req.json();
  const doc = await Medication.findOneAndUpdate(
    { _id: params.id, userId: uid },
    {
      name: body?.name,
      dose: body?.dose,
      schedule: body?.schedule,
      active: body?.active ?? true
    },
    { new: true }
  );

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
