'use client';
import { useEffect, useMemo, useState } from 'react';

type LabEntry = {
  id: string;
  type: 'a1c' | 'lipid';
  measuredAt: string;
  payload: {
    percent?: number;
    total?: number;
    ldl?: number;
    hdl?: number;
    triglycerides?: number;
  };
};

type LabsResponse = {
  entries: LabEntry[];
};

type Trend = {
  label: string;
  delta: number | null;
};

export function LabsSummary() {
  const [entries, setEntries] = useState<LabEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/measurements?types=a1c,lipid&limit=20', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: LabsResponse) => {
        if (active) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { latestA1c, latestLipid, a1cTrend, ldlTrend } = useMemo(() => {
    const a1cEntries = entries.filter((entry) => entry.type === 'a1c');
    const lipidEntries = entries.filter((entry) => entry.type === 'lipid');
    const latestA1c = a1cEntries[0] ?? null;
    const previousA1c = a1cEntries[1] ?? null;
    const latestLipid = lipidEntries[0] ?? null;
    const previousLipid = lipidEntries[1] ?? null;
    return {
      latestA1c,
      latestLipid,
      a1cTrend: computeTrend(latestA1c?.payload?.percent, previousA1c?.payload?.percent, '%'),
      ldlTrend: computeTrend(latestLipid?.payload?.ldl, previousLipid?.payload?.ldl, 'mg/dL'),
    };
  }, [entries]);

  return (
    <section className="cmx-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Labs</h2>
        <span className="text-xs opacity-70">Targets are general guidance</span>
      </div>

      {loading ? (
        <p className="text-sm opacity-70">Loading labs…</p>
      ) : !latestA1c && !latestLipid ? (
        <p className="text-sm opacity-70">No labs yet.</p>
      ) : (
        <div className="space-y-3">
          {latestA1c ? (
            <div className="border border-cmx-line rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase opacity-60">HbA1c</div>
                  <div className="text-lg font-semibold">{formatNumber(latestA1c.payload?.percent)}%</div>
                </div>
                <Badge {...a1cStatus(latestA1c.payload?.percent)} />
              </div>
              {a1cTrend.label ? <p className="text-xs opacity-70 mt-2">Trend: {a1cTrend.label}</p> : null}
            </div>
          ) : null}

          {latestLipid ? (
            <div className="border border-cmx-line rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase opacity-60">Lipid Panel</div>
                <div className="text-xs opacity-60">{formatDate(latestLipid.measuredAt)}</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <LabRow label="Total" value={latestLipid.payload?.total} status={totalStatus(latestLipid.payload?.total)} />
                <LabRow label="LDL" value={latestLipid.payload?.ldl} status={ldlStatus(latestLipid.payload?.ldl)} />
                <LabRow label="HDL" value={latestLipid.payload?.hdl} status={hdlStatus(latestLipid.payload?.hdl)} />
                <LabRow
                  label="Triglycerides"
                  value={latestLipid.payload?.triglycerides}
                  status={tgStatus(latestLipid.payload?.triglycerides)}
                />
              </div>
              {ldlTrend.label ? <p className="text-xs opacity-70">LDL trend: {ldlTrend.label}</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function LabRow({ label, value, status }: { label: string; value?: number; status: BadgeProps }) {
  return (
    <div className="flex items-center justify-between border border-cmx-line rounded-md px-2 py-1">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatNumber(value)}</span>
        <Badge {...status} />
      </div>
    </div>
  );
}

type BadgeProps = { label: string; color: string };

function Badge({ label, color }: BadgeProps) {
  return <span className={`cmx-badge text-xs ${color}`}>{label}</span>;
}

function computeTrend(current?: number, previous?: number, unit?: string): Trend {
  if (typeof current !== 'number' || typeof previous !== 'number') return { label: '', delta: null };
  const delta = current - previous;
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const formatted = Math.abs(delta).toFixed(1);
  return { label: `${arrow} ${formatted}${unit ? ` ${unit}` : ''}`, delta };
}

function formatNumber(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function a1cStatus(value?: number): BadgeProps {
  if (typeof value !== 'number') return { label: '—', color: 'bg-gray-400' };
  if (value < 5.7) return { label: 'At goal', color: 'bg-cmx-risk-green' };
  if (value < 6.5) return { label: 'Elevated', color: 'bg-cmx-risk-amber' };
  return { label: 'High', color: 'bg-cmx-risk-red' };
}

function totalStatus(value?: number): BadgeProps {
  if (typeof value !== 'number') return { label: '—', color: 'bg-gray-400' };
  if (value < 200) return { label: 'At goal', color: 'bg-cmx-risk-green' };
  if (value < 240) return { label: 'Borderline', color: 'bg-cmx-risk-amber' };
  return { label: 'High', color: 'bg-cmx-risk-red' };
}

function ldlStatus(value?: number): BadgeProps {
  if (typeof value !== 'number') return { label: '—', color: 'bg-gray-400' };
  if (value < 100) return { label: 'At goal', color: 'bg-cmx-risk-green' };
  if (value < 130) return { label: 'Borderline', color: 'bg-cmx-risk-amber' };
  if (value < 160) return { label: 'High', color: 'bg-cmx-risk-red' };
  return { label: 'Very high', color: 'bg-cmx-risk-red' };
}

function hdlStatus(value?: number): BadgeProps {
  if (typeof value !== 'number') return { label: '—', color: 'bg-gray-400' };
  if (value >= 60) return { label: 'At goal', color: 'bg-cmx-risk-green' };
  if (value >= 40) return { label: 'OK', color: 'bg-cmx-risk-amber' };
  return { label: 'Low', color: 'bg-cmx-risk-red' };
}

function tgStatus(value?: number): BadgeProps {
  if (typeof value !== 'number') return { label: '—', color: 'bg-gray-400' };
  if (value < 150) return { label: 'At goal', color: 'bg-cmx-risk-green' };
  if (value < 200) return { label: 'Borderline', color: 'bg-cmx-risk-amber' };
  return { label: 'High', color: 'bg-cmx-risk-red' };
}
