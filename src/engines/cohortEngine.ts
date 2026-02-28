import dayjs from 'dayjs';
import User from '@/models/User';
import Measurement from '@/models/Measurement';

type CohortComparison = {
  cohortLabel: string;
  benchmarks: {
    systolic: number;
    diastolic: number;
    bmiMin: number;
    bmiMax: number;
  };
  user: {
    systolic: number | null;
    diastolic: number | null;
    bmi: number | null;
  };
  summary: string;
  note: string;
};

type MeasurementDoc = { measuredAt: Date; payload?: Record<string, number> };

function getAgeBand(dob?: Date | null) {
  if (!dob) return 'Unknown age';
  const age = dayjs().diff(dayjs(dob), 'year');
  if (age < 40) return 'Under 40';
  if (age < 60) return '40–59';
  return '60+';
}

function getBenchmarks(sex?: string, dob?: Date | null) {
  const baseSys = sex === 'male' ? 122 : sex === 'female' ? 118 : 120;
  const baseDia = sex === 'male' ? 78 : sex === 'female' ? 74 : 76;
  const age = dob ? dayjs().diff(dayjs(dob), 'year') : null;
  const ageAdj = age && age >= 60 ? 8 : age && age >= 40 ? 4 : 0;
  return {
    systolic: baseSys + ageAdj,
    diastolic: baseDia + Math.round(ageAdj * 0.4),
    bmiMin: 18.5,
    bmiMax: 24.9,
  };
}

export async function computeCohortComparison(userId: string): Promise<CohortComparison | null> {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const sex = (user as any).profile?.sex;
  const dob = (user as any).profile?.dob ? new Date((user as any).profile?.dob) : null;
  const heightCm = (user as any).profile?.heightCm;

  const bp = await Measurement.find({
    userId,
    type: 'bp',
  })
    .sort({ measuredAt: -1 })
    .limit(1)
    .lean<MeasurementDoc[]>();
  const weight = await Measurement.find({
    userId,
    type: 'weight',
  })
    .sort({ measuredAt: -1 })
    .limit(1)
    .lean<MeasurementDoc[]>();

  const systolic = bp[0]?.payload?.systolic ?? null;
  const diastolic = bp[0]?.payload?.diastolic ?? null;
  const kg = weight[0]?.payload?.kg;
  const bmi =
    typeof kg === 'number' && typeof heightCm === 'number' && heightCm > 0
      ? kg / Math.pow(heightCm / 100, 2)
      : null;

  const benchmarks = getBenchmarks(sex, dob);
  const cohortLabel = `${getAgeBand(dob)} · ${sex || 'unspecified'}`;

  const summaryParts = [];
  if (systolic && diastolic) {
    summaryParts.push(
      `Your BP is ${Math.round(systolic)}/${Math.round(diastolic)} vs cohort ${benchmarks.systolic}/${benchmarks.diastolic}.`
    );
  }
  if (bmi) {
    summaryParts.push(`BMI ${bmi.toFixed(1)} vs healthy ${benchmarks.bmiMin}-${benchmarks.bmiMax}.`);
  }

  const summary = summaryParts.length
    ? summaryParts.join(' ')
    : 'Add BP/weight and profile details to see your cohort comparison.';

  const note = 'Benchmarks are estimates for general reference only.';

  return {
    cohortLabel,
    benchmarks,
    user: {
      systolic,
      diastolic,
      bmi: bmi ? Number(bmi.toFixed(1)) : null,
    },
    summary,
    note,
  };
}
