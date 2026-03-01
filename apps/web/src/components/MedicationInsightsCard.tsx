'use client';
import { useEffect, useState } from 'react';

type Insight = {
  medicationId: string;
  name: string;
  dose: string;
  schedule: string;
  startDate: string;
  adherenceRate: number | null;
  deltas: {
    systolic: number | null;
    diastolic: number | null;
    weight: number | null;
  };
  summary: string;
};

type InsightResponse = {
  insights: Insight[];
};

export function MedicationInsightsCard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/medications/insights')
      .then((res) => res.json())
      .then((data: InsightResponse) => {
        if (active) setInsights(data.insights ?? []);
      })
      .catch(() => {
        if (active) setInsights([]);
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
        <h2 className="font-medium">Medication Efficacy</h2>
        <span className="text-xs opacity-70">14‑day pre/post window</span>
      </div>
      {loading ? (
        <p className="text-sm opacity-70">Analyzing meds…</p>
      ) : insights.length === 0 ? (
        <p className="text-sm opacity-70">No active medications to analyze yet.</p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.medicationId} className="border border-cmx-line rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{insight.name}</div>
                  <div className="text-xs text-gray-500">
                    {insight.dose} · {insight.schedule} · Started {insight.startDate}
                  </div>
                </div>
                {insight.adherenceRate !== null ? (
                  <div className="text-xs text-gray-600">Adherence {insight.adherenceRate}%</div>
                ) : null}
              </div>
              <div className="text-sm text-gray-700 mt-2">{insight.summary}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
