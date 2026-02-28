'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { bandColor } from '@/lib/ui';

function ClinicianReportContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setError('Missing token');
      setLoading(false);
      return;
    }

    fetch(`/api/clinician/report?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">Loading report...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4 text-red-600">
          {error || 'Failed to load report'}
        </div>
      </main>
    );
  }

  const { patient, risk, features, riskTrend, recentMeasurements, adherence } = data;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="border-b border-cmx-line pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Cardiometrix Patient Summary</h1>
            <p className="text-sm text-gray-600 mt-1">
              Wellness decision-support summary; not for diagnosis
            </p>
          </div>
          <div className="flex gap-2">
            <button className="cmx-btn" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        </div>
      </header>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-2">Patient Information</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="font-medium">Name:</span> {patient.name}</div>
          <div><span className="font-medium">Email:</span> {patient.email}</div>
          <div><span className="font-medium">Report Date:</span> {data.asOf}</div>
        </div>
      </section>

      {risk && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Current Risk Assessment</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm">Risk Score:</span>
              <span className="text-xl font-bold">{Number(risk.score).toFixed(2)}</span>
              <span className={`cmx-badge ${bandColor(risk.band)}`}>{risk.band.toUpperCase()}</span>
            </div>
            {risk.drivers && risk.drivers.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium mb-2">Top Risk Drivers:</div>
                <ul className="list-disc ml-6 space-y-1">
                  {risk.drivers.map((d: any, i: number) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{d.feature}:</span> {d.direction} 
                      (contribution: {Number(d.contribution).toFixed(3)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {riskTrend && riskTrend.length > 0 && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">30-Day Risk Trend</h2>
          <div className="space-y-2">
            <div className="flex items-end gap-1 h-32 border-b border-cmx-line">
              {riskTrend.slice(-14).map((point: any, i: number) => {
                const height = Math.round(point.score * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end">
                    <div
                      className={`w-full ${
                        point.band === 'green' ? 'bg-cmx-risk-green' :
                        point.band === 'amber' ? 'bg-cmx-risk-amber' :
                        'bg-cmx-risk-red'
                      }`}
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${point.date}: ${point.score.toFixed(2)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{riskTrend[Math.max(0, riskTrend.length - 14)]?.date}</span>
              <span>{riskTrend[riskTrend.length - 1]?.date}</span>
            </div>
          </div>
        </section>
      )}

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Recent Measurements</h2>
        
        {recentMeasurements.bp && recentMeasurements.bp.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Blood Pressure (Last 14 days)</div>
            <div className="text-xs space-y-1">
              {recentMeasurements.bp.slice(0, 5).map((bp: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className="w-24">{bp.date}</span>
                  <span>{bp.systolic}/{bp.diastolic} {bp.pulse ? `(${bp.pulse} bpm)` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentMeasurements.weight && recentMeasurements.weight.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Weight Trend (Last 30 days)</div>
            <div className="text-xs space-y-1">
              <div className="flex gap-3">
                <span className="w-24">Most Recent:</span>
                <span>{recentMeasurements.weight[0]?.kg} kg</span>
              </div>
              {recentMeasurements.weight.length > 1 && (
                <div className="flex gap-3">
                  <span className="w-24">30 days ago:</span>
                  <span>{recentMeasurements.weight[recentMeasurements.weight.length - 1]?.kg} kg</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {adherence && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-2">Engagement</h2>
          <div className="text-sm space-y-1">
            <div>Nudge Completion Rate: <span className="font-medium">{adherence.adherenceRate}%</span></div>
            <div className="text-xs text-gray-600">
              {adherence.completedNudges} of {adherence.totalNudges} nudges completed (last 30 days)
            </div>
          </div>
        </section>
      )}

      <section className="cmx-card p-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This summary is for wellness decision-support only. 
          It is not a diagnostic tool. Clinical decisions should be based on comprehensive 
          medical evaluation and appropriate clinical judgment.
        </p>
      </section>
    </main>
  );
}

export default function ClinicianReportPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-6"><div className="cmx-card p-4">Loading...</div></main>}>
      <ClinicianReportContent />
    </Suspense>
  );
}
