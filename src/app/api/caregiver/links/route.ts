import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireAuth } from '@/middleware/requireAuth';
import CaregiverAccess from '@/models/CaregiverAccess';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  await dbConnect();
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { uid } = auth.claims!;

  const links = await CaregiverAccess.find({ caregiverId: uid }).lean();
  const patientIds = links.map((link: any) => link.patientId);
  const patients = await User.find({ _id: { $in: patientIds } }).lean();

  return NextResponse.json({
    patients: patients.map((p: any) => ({
      id: String(p._id),
      name: p.name,
      email: p.email,
    })),
  });
}
