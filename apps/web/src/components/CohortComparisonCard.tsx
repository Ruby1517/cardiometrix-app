'use client';
import { useEffect, useState } from 'react';

type Comparison = {
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

type ComparisonResponse = {
  comparison: Comparison | null;
};

export function CohortComparisonCard() {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/cohort/compare', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ComparisonResponse) => {
        if (active) setComparison(data.comparison ?? null);
      })
      .catch(() => {
        if (active) setComparison(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="cmx-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Cohort Comparison</h2>
        <span className="text-xs opacity-70">Benchmarks</span>
      </div>
      {loading ? (
        <p className="text-sm opacity-70">Loading cohort…</p>
      ) : !comparison ? (
        <p className="text-sm opacity-70">Add profile details to see your cohort.</p>
      ) : (
        <>
          <div className="text-sm text-gray-700">{comparison.summary}</div>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            <div className="border border-cmx-line rounded px-3 py-2">
              Cohort: {comparison.cohortLabel}
            </div>
            <div className="border border-cmx-line rounded px-3 py-2">
              BP benchmark: {comparison.benchmarks.systolic}/{comparison.benchmarks.diastolic}
            </div>
            <div className="border border-cmx-line rounded px-3 py-2">
              BMI target: {comparison.benchmarks.bmiMin}-{comparison.benchmarks.bmiMax}
            </div>
            <div className="border border-cmx-line rounded px-3 py-2">
              Your BMI: {comparison.user.bmi ?? '—'}
            </div>
          </div>
          <p className="text-xs text-gray-500">{comparison.note}</p>
        </>
      )}
    </section>
  );
}
