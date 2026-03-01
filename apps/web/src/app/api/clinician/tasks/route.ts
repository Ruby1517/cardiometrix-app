import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import ClinicianTask from '@/models/ClinicianTask';

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

  const tasks = await ClinicianTask.find({ patientId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({
    tasks: tasks.map((task: any) => ({
      id: String(task._id),
      authorId: String(task.authorId),
      title: task.title,
      detail: task.detail,
      status: task.status,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
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
  if (!body?.patientId || !body?.title) {
    return NextResponse.json({ error: 'Missing patientId or title' }, { status: 400 });
  }

  const task = await ClinicianTask.create({
    patientId: body.patientId,
    authorId: uid,
    title: String(body.title),
    detail: body.detail ? String(body.detail) : undefined,
    status: body.status === 'done' ? 'done' : 'open',
    dueDate: body.dueDate ? String(body.dueDate) : undefined,
  });

  return NextResponse.json({
    task: {
      id: String(task._id),
      authorId: String(task.authorId),
      title: task.title,
      detail: task.detail,
      status: task.status,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    },
  });
}
