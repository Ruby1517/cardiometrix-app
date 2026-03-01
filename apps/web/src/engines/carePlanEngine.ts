import dayjs from 'dayjs';
import WeeklyRiskSummary from '@/models/WeeklyRiskSummary';
import CarePlan from '@/models/CarePlan';

type ActionItem = {
  title: string;
  detail: string;
  metric: string;
  target: string;
};

function buildAction(title: string, detail: string, metric: string, target: string): ActionItem {
  return { title, detail, metric, target };
}

export async function generateWeeklyCarePlan(userId: string, dateISO: string) {
  const weekStart = dayjs(dateISO).startOf('week').format('YYYY-MM-DD');
  const weekEnd = dayjs(dateISO).startOf('week').add(6, 'day').format('YYYY-MM-DD');

  const weekly = await WeeklyRiskSummary.findOne({ userId, weekStart }).lean();
  if (!weekly) return null;

  const metrics = weekly.metrics || {};
  const actions: ActionItem[] = [];
  const focusAreas: string[] = [];

  if ((metrics.bp_sys_avg_7d ?? 0) >= 130 || (metrics.bp_sys_slope_14d ?? 0) > 0.3) {
    focusAreas.push('Blood pressure');
    actions.push(
      buildAction(
        'Daily BP check-in',
        'Log BP at the same time each day (morning recommended).',
        'Systolic BP',
        'Aim < 130 mmHg'
      )
    );
  }

  if ((metrics.weight_slope_14d ?? 0) > 0.04) {
    focusAreas.push('Weight stability');
    actions.push(
      buildAction(
        'Weight check-ins',
        'Weigh 3–4x this week, same time of day.',
        'Weight trend',
        'Keep weekly change near 0 kg'
      )
    );
  }

  if ((metrics.risk_score_slope_14d ?? 0) > 0.003) {
    focusAreas.push('Risk trend');
    actions.push(
      buildAction(
        'Consistency sprint',
        'Log vitals and symptoms daily to stabilize trend signals.',
        'Risk score trend',
        'Hold or improve weekly trend'
      )
    );
  }

  if (!actions.length) {
    focusAreas.push('Maintenance');
    actions.push(
      buildAction(
        'Maintain routine',
        'Keep logging 2–3x this week to sustain stable trends.',
        'Overall risk',
        'Stay consistent'
      )
    );
  }

  const summary = `This week’s focus: ${focusAreas.join(', ')}.`;

  const doc = {
    userId,
    weekStart,
    weekEnd,
    summary,
    focusAreas,
    actions,
  };

  const saved = await CarePlan.findOneAndUpdate(
    { userId, weekStart },
    doc,
    { upsert: true, new: true }
  ).lean();

  return saved;
}
