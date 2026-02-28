import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import ClinicianNote from '@/models/ClinicianNote';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid, role } = auth.claims!;

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');
  if (!patientId) return NextResponse.json({ error: 'Missing patientId' }, { status: 400 });

  if (role === 'patient' && patientId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const notes = await ClinicianNote.find({ patientId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    notes: notes.map((note: any) => ({
      id: String(note._id),
      authorId: String(note.authorId),
      body: note.body,
      createdAt: note.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const forbidden = requireRole(auth.claims!, ['clinician', 'admin']);
  if (forbidden) return forbidden;
  const { uid } = auth.claims!;

  const body = await req.json();
  if (!body?.patientId || !body?.body) {
    return NextResponse.json({ error: 'Missing patientId or body' }, { status: 400 });
  }

  const note = await ClinicianNote.create({
    patientId: body.patientId,
    authorId: uid,
    body: String(body.body),
  });

  return NextResponse.json({
    note: {
      id: String(note._id),
      authorId: String(note.authorId),
      body: note.body,
      createdAt: note.createdAt,
    },
  });
}
