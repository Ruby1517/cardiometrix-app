import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import dayjs from 'dayjs';
import { computeDailyFeatures } from '@/engines/featureEngine';
import { computeRisk } from '@/engines/riskEngine';
import { upsertDailyNudge } from '@/engines/nudgeEngine';


(async () => {
await dbConnect();
const users = await User.find({ role: 'patient' }).select('_id').lean();
const today = dayjs().format('YYYY-MM-DD');
for (const u of users) {
const uid = String((u as any)._id);
try {
await computeDailyFeatures(uid, today);
await computeRisk(uid, today, 30);
await upsertDailyNudge(uid, today);
console.log('ok', uid);
} catch (e) { console.error('fail', uid, e); }
}
process.exit(0);
})();