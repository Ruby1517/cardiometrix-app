import dayjs from 'dayjs';
import Measurement from '@/models/Measurement';
import SymptomCheckin from '@/models/SymptomCheckin';
import MedicationAdherence from '@/models/MedicationAdherence';

type QualityResult = {
  score: number;
  breakdown: {
    vitals: number;
    symptoms: number;
    meds: number;
  };
  days: {
    vitals: number;
    symptoms: number;
    meds: number;
  };
  windowDays: number;
  summary: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function computeDataQuality(userId: string, windowDays = 7): Promise<QualityResult> {
  const end = dayjs().endOf('day');
  const start = end.subtract(windowDays - 1, 'day').startOf('day');
  const dayKeys = new Set<string>();
  for (let i = 0; i < windowDays; i += 1) {
    dayKeys.add(start.add(i, 'day').format('YYYY-MM-DD'));
  }

  const [vitalsRows, symptomRows, medRows] = await Promise.all([
    Measurement.find({
      userId,
      type: { $in: ['bp', 'weight'] },
      measuredAt: { $gte: start.toDate(), $lte: end.toDate() },
    }).lean(),
    SymptomCheckin.find({
      userId,
      checkedAt: { $gte: start.toDate(), $lte: end.toDate() },
    }).lean(),
    MedicationAdherence.find({
      userId,
      date: { $gte: start.format('YYYY-MM-DD'), $lte: end.format('YYYY-MM-DD') },
    }).lean(),
  ]);

  const vitalsDays = new Set<string>();
  for (const row of vitalsRows as any[]) {
    vitalsDays.add(dayjs(row.measuredAt).format('YYYY-MM-DD'));
  }

  const symptomDays = new Set<string>();
  for (const row of symptomRows as any[]) {
    symptomDays.add(dayjs(row.checkedAt).format('YYYY-MM-DD'));
  }

  const medsDays = new Set<string>();
  for (const row of medRows as any[]) {
    medsDays.add(row.date);
  }

  const vitalsScore = (vitalsDays.size / windowDays) * 50;
  const symptomScore = (symptomDays.size / windowDays) * 25;
  const medsScore = (medsDays.size / windowDays) * 25;
  const score = clampScore(vitalsScore + symptomScore + medsScore);

  const summary = score >= 80
    ? 'Great logging consistency this week.'
    : score >= 60
      ? 'Logging is decent. Add a few more check-ins for better insights.'
      : 'Limited data. Log vitals and symptoms more consistently.';

  return {
    score,
    breakdown: {
      vitals: Math.round(vitalsScore),
      symptoms: Math.round(symptomScore),
      meds: Math.round(medsScore),
    },
    days: {
      vitals: vitalsDays.size,
      symptoms: symptomDays.size,
      meds: medsDays.size,
    },
    windowDays,
    summary,
  };
}
