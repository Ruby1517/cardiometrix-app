'use client';
import { useEffect, useState } from 'react';

export default function TrendsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/trends').then(r => r.json()),
      fetch('/api/risk/weekly').then(r => r.json()),
      fetch('/api/risk/forecast?horizons=30,60,90').then(r => r.json())
    ])
      .then(([trends, weekly, forecast]) => setData({ trends, weekly: weekly?.summary ?? null, forecast: forecast?.forecast ?? null }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">Loading trends...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">No data available</div>
      </main>
    );
  }

  const { trends, weekly, forecast } = data;
  const { riskTrend, adherence, measurements } = trends;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Trends</h1>

      {weekly && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-2">Weekly Risk Summary</h2>
          <p className="text-sm text-gray-700">{weekly.summaryText}</p>
          <p className="text-xs text-gray-500 mt-1">
            {weekly.weekStart} — {weekly.weekEnd} · Trend: {weekly.signals?.trend ?? '—'}
          </p>
          {weekly.explanations?.length > 0 && (
            <ul className="mt-3 text-sm list-disc ml-5 space-y-1">
              {weekly.explanations.map((line: string, i: number) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {forecast && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-2">Risk Forecast (if current trend continues)</h2>
          <p className="text-sm text-gray-700">{forecast.explanation}</p>
          <div className="grid gap-3 sm:grid-cols-3 mt-4">
            {forecast.horizons.map((point: any) => (
              <div key={point.days} className="border border-cmx-line rounded-lg p-3">
                <div className="text-xs uppercase text-gray-500">{point.days} days</div>
                <div className="text-xl font-semibold">{Number(point.score).toFixed(2)}</div>
                <div className="text-xs text-gray-500">
                  Band: <span className={`cmx-badge ${
                    point.band === 'green' ? 'bg-cmx-risk-green' :
                    point.band === 'amber' ? 'bg-cmx-risk-amber' :
                    'bg-cmx-risk-red'
                  }`}>{point.band.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Confidence: {forecast.confidence}</p>
        </section>
      )}

      {riskTrend && riskTrend.length > 0 && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">30-Day Risk Trend</h2>
          <div className="space-y-2">
            <div className="flex items-end gap-1 h-48 border-b border-cmx-line">
              {riskTrend.map((point: any, i: number) => {
                const height = Math.round(point.score * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div
                      className={`w-full transition-all ${
                        point.band === 'green' ? 'bg-cmx-risk-green' :
                        point.band === 'amber' ? 'bg-cmx-risk-amber' :
                        'bg-cmx-risk-red'
                      } hover:opacity-80`}
                      style={{ height: `${Math.max(height, 5)}%`, minHeight: '4px' }}
                    />
                    <div className="hidden group-hover:block absolute bottom-full mb-1 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap">
                      {point.date}: {point.score.toFixed(2)} ({point.band})
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{riskTrend[0]?.date}</span>
              <span>{riskTrend[riskTrend.length - 1]?.date}</span>
            </div>
          </div>
        </section>
      )}

      {adherence && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Engagement & Adherence</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Nudge Completion Rate</span>
                <span className="font-medium">{adherence.adherenceRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${adherence.adherenceRate}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {adherence.completedNudges} of {adherence.totalNudges} nudges completed (last 30 days)
            </div>
          </div>
        </section>
      )}

      {measurements && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Recent Measurements</h2>
          
          {measurements.bp && measurements.bp.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Blood Pressure (Last 14 days)</div>
              <div className="flex items-end gap-1 h-32 border-b border-cmx-line">
                {measurements.bp.slice(0, 14).reverse().map((bp: any, i: number) => {
                  const maxSys = 200;
                  const height = Math.round((bp.systolic / maxSys) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full bg-red-400"
                        style={{ height: `${Math.max(height, 5)}%`, minHeight: '2px' }}
                        title={`${bp.date}: ${bp.systolic}/${bp.diastolic}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {measurements.weight && measurements.weight.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Weight Trend (Last 30 days)</div>
              <div className="flex items-end gap-1 h-32 border-b border-cmx-line">
                {measurements.weight.slice(0, 30).reverse().map((w: any, i: number) => {
                  const weights = measurements.weight.map((ww: any) => ww.kg);
                  const minW = Math.min(...weights);
                  const maxW = Math.max(...weights);
                  const range = maxW - minW || 1;
                  const height = Math.round(((w.kg - minW) / range) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className="w-full bg-blue-400"
                        style={{ height: `${Math.max(height, 5)}%`, minHeight: '2px' }}
                        title={`${w.date}: ${w.kg} kg`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}


