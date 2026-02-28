'use client';
import { useEffect, useState } from 'react';

type Quality = {
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

type QualityResponse = {
  quality: Quality;
};

export function DataQualityCard() {
  const [quality, setQuality] = useState<Quality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/quality?window=7', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: QualityResponse) => {
        if (active) setQuality(data.quality ?? null);
      })
      .catch(() => {
        if (active) setQuality(null);
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
        <h2 className="font-medium">Data Quality</h2>
        <span className="text-xs opacity-70">Last 7 days</span>
      </div>
      {loading ? (
        <p className="text-sm opacity-70">Calculating quality…</p>
      ) : !quality ? (
        <p className="text-sm opacity-70">No data yet.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-semibold">{quality.score}</div>
            <div className="text-sm text-gray-600">{quality.summary}</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            <div className="border border-cmx-line rounded px-3 py-2">
              Vitals: {quality.days.vitals}/{quality.windowDays}
            </div>
            <div className="border border-cmx-line rounded px-3 py-2">
              Symptoms: {quality.days.symptoms}/{quality.windowDays}
            </div>
            <div className="border border-cmx-line rounded px-3 py-2">
              Meds: {quality.days.meds}/{quality.windowDays}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
