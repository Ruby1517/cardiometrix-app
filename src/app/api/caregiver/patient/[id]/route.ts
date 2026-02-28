import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import CaregiverAccess from '@/models/CaregiverAccess';
import User from '@/models/User';
import RiskScore from '@/models/RiskScore';
import Measurement from '@/models/Measurement';
import ClinicianNote from '@/models/ClinicianNote';
import ClinicianTask from '@/models/ClinicianTask';
import ClinicianMessage from '@/models/ClinicianMessage';
import dayjs from 'dayjs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const { id: patientId } = await params;
  const access = await CaregiverAccess.findOne({ caregiverId: uid, patientId }).lean();
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const patient = await User.findById(patientId).lean();
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const today = dayjs().format('YYYY-MM-DD');
  const last14Days = dayjs().subtract(14, 'days').toDate();

  const [risk, recentBp, recentWeight, notes, tasks, messages] = await Promise.all([
    RiskScore.findOne({ userId: patientId, date: today }).lean(),
    Measurement.find({
      userId: patientId,
      type: 'bp',
      measuredAt: { $gte: last14Days },
    })
      .sort({ measuredAt: -1 })
      .limit(10)
      .lean(),
    Measurement.find({
      userId: patientId,
      type: 'weight',
      measuredAt: { $gte: last14Days },
    })
      .sort({ measuredAt: -1 })
      .limit(10)
      .lean(),
    ClinicianNote.find({ patientId }).sort({ createdAt: -1 }).limit(10).lean(),
    ClinicianTask.find({ patientId }).sort({ createdAt: -1 }).limit(10).lean(),
    ClinicianMessage.find({ patientId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return NextResponse.json({
    patient: {
      id: patientId,
      name: (patient as any).name,
      email: (patient as any).email,
    },
    risk: risk
      ? {
          score: (risk as any).score,
          band: (risk as any).band,
          date: today,
        }
      : null,
    measurements: {
      bp: recentBp.map((m: any) => ({
        date: dayjs(m.measuredAt).format('YYYY-MM-DD'),
        systolic: m.payload.systolic,
        diastolic: m.payload.diastolic,
        pulse: m.payload.pulse,
      })),
      weight: recentWeight.map((m: any) => ({
        date: dayjs(m.measuredAt).format('YYYY-MM-DD'),
        kg: m.payload.kg,
      })),
    },
    collaboration: {
      notes: notes.map((n: any) => ({
        id: String(n._id),
        body: n.body,
        createdAt: n.createdAt,
      })),
      tasks: tasks.map((t: any) => ({
        id: String(t._id),
        title: t.title,
        detail: t.detail,
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
      })),
      messages: messages.map((m: any) => ({
        id: String(m._id),
        authorRole: m.authorRole,
        body: m.body,
        createdAt: m.createdAt,
      })),
    },
  });
}
