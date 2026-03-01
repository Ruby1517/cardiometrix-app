import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import { requireRole } from '@/middleware/requireRole';
import User from '@/models/User';
import RiskScore from '@/models/RiskScore';
import DailyFeature from '@/models/DailyFeature';
import Measurement from '@/models/Measurement';
import Nudge from '@/models/Nudge';
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
  
  const forbidden = requireRole(auth.claims!, ['clinician', 'admin']);
  if (forbidden) return forbidden;

  const { id: patientId } = await params;
  const today = dayjs().format('YYYY-MM-DD');
  const last30Days = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
  const last14Days = dayjs().subtract(14, 'days').toDate();

  const patient = await User.findById(patientId).lean();
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const risk = await RiskScore.findOne({ userId: patientId, date: today }).lean();
  const riskHistory = await RiskScore.find({
    userId: patientId,
    date: { $gte: last30Days }
  }).sort({ date: 1 }).lean();

  const recentBp = await Measurement.find({
    userId: patientId,
    type: 'bp',
    measuredAt: { $gte: last14Days }
  }).sort({ measuredAt: -1 }).limit(10).lean();

  const nudges = await Nudge.find({
    userId: patientId,
    date: { $gte: last30Days }
  }).sort({ date: -1 }).limit(30).lean();

  const notes = await ClinicianNote.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const tasks = await ClinicianTask.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const messages = await ClinicianMessage.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const totalNudges = nudges.length;
  const completedNudges = nudges.filter(n => n.status === 'completed').length;
  const adherenceRate = totalNudges > 0 
    ? Math.round((completedNudges / totalNudges) * 100)
    : 0;

  return NextResponse.json({
    patient: {
      id: patientId,
      name: (patient as any).name,
      email: (patient as any).email,
    },
    risk: risk ? {
      score: (risk as any).score,
      band: (risk as any).band,
      drivers: (risk as any).drivers || [],
      date: today,
    } : null,
    riskTrend: riskHistory.map((r: any) => ({
      date: r.date,
      score: r.score,
      band: r.band,
    })),
    measurements: {
      bp: recentBp.map((m: any) => ({
        date: dayjs(m.measuredAt).format('YYYY-MM-DD'),
        systolic: m.payload.systolic,
        diastolic: m.payload.diastolic,
        pulse: m.payload.pulse,
      })),
    },
    adherence: {
      totalNudges,
      completedNudges,
      adherenceRate,
    },
    nudges: nudges.map((n: any) => ({
      date: (n as any).date,
      message: (n as any).message,
      category: (n as any).category,
      status: (n as any).status,
    })),
    collaboration: {
      notes: notes.map((n: any) => ({
        id: String(n._id),
        authorId: String(n.authorId),
        body: n.body,
        createdAt: n.createdAt,
      })),
      tasks: tasks.map((t: any) => ({
        id: String(t._id),
        authorId: String(t.authorId),
        title: t.title,
        detail: t.detail,
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
      })),
      messages: messages.map((m: any) => ({
        id: String(m._id),
        authorId: String(m.authorId),
        authorRole: m.authorRole,
        body: m.body,
        createdAt: m.createdAt,
      })),
    },
  });
}



