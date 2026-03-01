import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Measurement from '@/models/Measurement';
import { hashPassword } from '@/lib/crypto';
import dayjs from 'dayjs';
import { computeDailyFeatures } from '@/engines/featureEngine';
import { computeRisk } from '@/engines/riskEngine';
import { upsertDailyNudge } from '@/engines/nudgeEngine';

async function ensureUser(name: string, email: string, password: string, role: 'patient'|'clinician'|'admin') {
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({ name, email, passwordHash: await hashPassword(password), role });
    console.log('Created', role, email);
  } else {
    console.log('Exists', role, email);
  }
  return u;
}

async function seedMeasurements(userId: string) {
  // 14 days of synthetic data
  const today = dayjs();
  for (let i=13; i>=0; i--) {
    const d = today.subtract(i, 'day');
    const tMorning = d.hour(8).minute(15).toDate();
    const tEvening = d.hour(19).minute(30).toDate();
    const sys = 118 + Math.round(Math.random()*10) - 5;
    const dia = 76 + Math.round(Math.random()*8) - 4;
    await Measurement.create({ userId, type:'bp', measuredAt: tMorning, source:'seed', payload:{ systolic: sys, diastolic: dia, pulse: 65+Math.round(Math.random()*10) }});
    await Measurement.create({ userId, type:'bp', measuredAt: tEvening, source:'seed', payload:{ systolic: sys+Math.round(Math.random()*6-3), diastolic: dia+Math.round(Math.random()*4-2), pulse: 65+Math.round(Math.random()*10) }});
    await Measurement.create({ userId, type:'steps', measuredAt: d.hour(23).toDate(), source:'seed', payload:{ count: 6000 + Math.round(Math.random()*5000) }});
    await Measurement.create({ userId, type:'sleep', measuredAt: d.hour(7).toDate(), source:'seed', payload:{ hours: 6 + Math.random()*2, efficiency: 0.85 }});
    await Measurement.create({ userId, type:'hrv', measuredAt: d.hour(7).toDate(), source:'seed', payload:{ rmssd: 50 + Math.random()*25 }});
    await Measurement.create({ userId, type:'weight', measuredAt: d.hour(7).toDate(), source:'seed', payload:{ kg: 78 + (Math.random()-0.5)*0.6 }});
  }
}

(async () => {
  await dbConnect();
  const admin = await ensureUser('Admin', 'admin@cmx.local', 'Admin1234!', 'admin');
  const clinician = await ensureUser('Dr. Rivera', 'clinician@cmx.local', 'Clinician123!', 'clinician');
  const demo = await ensureUser('Demo Patient', 'demo@cmx.local', 'Demo1234!', 'patient');
  if (demo) {
    await Measurement.deleteMany({ userId: demo._id });
    await seedMeasurements(String(demo._id));
    const today = dayjs().format('YYYY-MM-DD');
    await computeDailyFeatures(String(demo._id), today);
    await computeRisk(String(demo._id), today, 30);
    await upsertDailyNudge(String(demo._id), today);
  }
  console.log('Seed complete');
  process.exit(0);
})();