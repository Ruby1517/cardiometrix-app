import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import ClinicianMessage from '@/models/ClinicianMessage';

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

  const messages = await ClinicianMessage.find({ patientId }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({
    messages: messages.map((message: any) => ({
      id: String(message._id),
      authorId: String(message.authorId),
      authorRole: message.authorRole,
      body: message.body,
      createdAt: message.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid, role } = auth.claims!;

  const body = await req.json();
  if (!body?.patientId || !body?.body) {
    return NextResponse.json({ error: 'Missing patientId or body' }, { status: 400 });
  }

  if (role === 'patient' && body.patientId !== uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const message = await ClinicianMessage.create({
    patientId: body.patientId,
    authorId: uid,
    authorRole: role,
    body: String(body.body),
  });

  return NextResponse.json({
    message: {
      id: String(message._id),
      authorId: String(message.authorId),
      authorRole: message.authorRole,
      body: message.body,
      createdAt: message.createdAt,
    },
  });
}
