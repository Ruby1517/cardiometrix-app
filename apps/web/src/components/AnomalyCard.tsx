'use client';
import { useEffect, useState } from 'react';

type Anomaly = {
  type: 'bp' | 'weight';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
  date: string;
};

type AnomalyResponse = {
  anomalies: Anomaly[];
};

export function AnomalyCard() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/anomalies', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: AnomalyResponse) => {
        if (active) setAnomalies(data.anomalies ?? []);
      })
      .catch(() => {
        if (active) setAnomalies([]);
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
        <h2 className="font-medium">Alerts</h2>
        <span className="text-xs opacity-70">BP/weight spikes</span>
      </div>
      {loading ? (
        <p className="text-sm opacity-70">Checking for anomalies…</p>
      ) : anomalies.length === 0 ? (
        <p className="text-sm opacity-70">No spikes detected.</p>
      ) : (
        <div className="space-y-2">
          {anomalies.map((anomaly) => (
            <div
              key={`${anomaly.type}-${anomaly.date}-${anomaly.title}`}
              className="border border-cmx-line rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{anomaly.title}</div>
                <span className="text-xs text-gray-500">{anomaly.date}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{anomaly.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
