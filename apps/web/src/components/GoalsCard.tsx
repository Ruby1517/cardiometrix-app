'use client';
import { useEffect, useMemo, useState } from 'react';

type Goal = {
  id: string;
  bpSystolicTarget: number | null;
  bpDiastolicTarget: number | null;
  weightTargetKg: number | null;
  updatedAt?: string;
};

type GoalResponse = {
  goal: Goal | null;
};

type VitalEntry = {
  id: string;
  measuredAt: string;
  systolic?: number;
  diastolic?: number;
  weight?: number;
};

type VitalsResponse = {
  entries: VitalEntry[];
};

export function GoalsCard() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<VitalEntry[]>([]);
  const [form, setForm] = useState({ systolic: '', diastolic: '', weight: '' });

  useEffect(() => {
    let active = true;
    fetch('/api/goals', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: GoalResponse) => {
        if (!active) return;
        setGoal(data.goal ?? null);
        if (data.goal) {
          setForm({
            systolic: data.goal.bpSystolicTarget?.toString() ?? '',
            diastolic: data.goal.bpDiastolicTarget?.toString() ?? '',
            weight: data.goal.weightTargetKg?.toString() ?? '',
          });
        }
      })
      .catch(() => undefined);

    fetch('/api/vitals?limit=120', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: VitalsResponse) => {
        if (!active) return;
        setEntries(data.entries ?? []);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const { latestBp, latestWeight, bpDelta, weightDelta } = useMemo(() => {
    return computeVitalsSummary(entries);
  }, [entries]);

  async function saveGoals() {
    setSaving(true);
    try {
      const payload = {
        bpSystolicTarget: form.systolic ? Number(form.systolic) : undefined,
        bpDiastolicTarget: form.diastolic ? Number(form.diastolic) : undefined,
        weightTargetKg: form.weight ? Number(form.weight) : undefined,
      };
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as GoalResponse;
      setGoal(data.goal ?? null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cmx-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Goals</h2>
        <span className="text-xs opacity-70">Weekly delta shown below</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs uppercase opacity-70">BP Target</label>
          <div className="flex gap-2 mt-1">
            <input
              className="border border-cmx-line rounded px-2 py-2 w-20"
              placeholder="SYS"
              value={form.systolic}
              onChange={(e) => setForm((prev) => ({ ...prev, systolic: e.target.value }))}
            />
            <input
              className="border border-cmx-line rounded px-2 py-2 w-20"
              placeholder="DIA"
              value={form.diastolic}
              onChange={(e) => setForm((prev) => ({ ...prev, diastolic: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase opacity-70">Weight Target</label>
          <div className="flex gap-2 mt-1">
            <input
              className="border border-cmx-line rounded px-2 py-2 w-24"
              placeholder="kg"
              value={form.weight}
              onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-end">
          <button className="cmx-btn w-full" onClick={saveGoals} disabled={saving}>
            {saving ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-cmx-line rounded-lg p-3">
          <div className="text-xs uppercase opacity-70">Current BP</div>
          <div className="text-lg font-semibold">
            {latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : '—'}
          </div>
          <div className="text-xs opacity-70 mt-1">
            Target: {goal?.bpSystolicTarget ?? '—'}/{goal?.bpDiastolicTarget ?? '—'}
          </div>
          {bpDelta ? <div className="text-xs opacity-70 mt-1">7d change: {bpDelta}</div> : null}
        </div>
        <div className="border border-cmx-line rounded-lg p-3">
          <div className="text-xs uppercase opacity-70">Current Weight</div>
          <div className="text-lg font-semibold">{latestWeight ? `${latestWeight.toFixed(1)} kg` : '—'}</div>
          <div className="text-xs opacity-70 mt-1">Target: {goal?.weightTargetKg ?? '—'} kg</div>
          {weightDelta ? <div className="text-xs opacity-70 mt-1">7d change: {weightDelta}</div> : null}
        </div>
      </div>
    </section>
  );
}

function computeVitalsSummary(entries: VitalEntry[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const bpEntries = entries.filter((entry) => entry.systolic && entry.diastolic);
  const weightEntries = entries.filter((entry) => typeof entry.weight === 'number');

  const latestBp = bpEntries[0] ?? null;
  const latestWeight = weightEntries[0]?.weight ?? null;

  const bpWeek = bpEntries.filter((entry) => new Date(entry.measuredAt).getTime() >= weekAgo);
  const weightWeek = weightEntries.filter((entry) => new Date(entry.measuredAt).getTime() >= weekAgo);

  const bpDelta = formatBpDelta(bpWeek);
  const weightDelta = formatWeightDelta(weightWeek);

  return { latestBp, latestWeight, bpDelta, weightDelta };
}

function formatBpDelta(entries: VitalEntry[]) {
  if (entries.length < 2) return '';
  const oldest = entries[entries.length - 1];
  const latest = entries[0];
  const sysDelta = (latest.systolic ?? 0) - (oldest.systolic ?? 0);
  const diaDelta = (latest.diastolic ?? 0) - (oldest.diastolic ?? 0);
  return `${formatSigned(sysDelta)} / ${formatSigned(diaDelta)} mmHg`;
}

function formatWeightDelta(entries: VitalEntry[]) {
  if (entries.length < 2) return '';
  const oldest = entries[entries.length - 1];
  const latest = entries[0];
  if (typeof oldest.weight !== 'number' || typeof latest.weight !== 'number') return '';
  const delta = latest.weight - oldest.weight;
  return `${formatSigned(delta)} kg`;
}

function formatSigned(value: number) {
  const fixed = Math.abs(value).toFixed(1);
  if (value > 0) return `+${fixed}`;
  if (value < 0) return `-${fixed}`;
  return `0.0`;
}
