import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import ClinicianTask from '@/models/ClinicianTask';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const forbidden = requireRole(auth.claims!, ['clinician', 'admin']);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, string> = {};
  if (body?.status) update.status = body.status === 'done' ? 'done' : 'open';
  if (body?.title) update.title = String(body.title);
  if (body?.detail) update.detail = String(body.detail);
  if (body?.dueDate) update.dueDate = String(body.dueDate);

  const task = await ClinicianTask.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
