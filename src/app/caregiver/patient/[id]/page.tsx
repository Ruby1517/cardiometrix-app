'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function CaregiverPatientPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    fetch(`/api/caregiver/patient/${patientId}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return <main className="mx-auto max-w-4xl p-6"><div className="cmx-card p-4">Loading…</div></main>;
  }

  if (!data || data.error) {
    return <main className="mx-auto max-w-4xl p-6"><div className="cmx-card p-4">Access denied.</div></main>;
  }

  const { patient, risk, measurements, collaboration } = data;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{patient.name}</h1>
          <p className="text-sm text-gray-600">{patient.email}</p>
        </div>
        <a href="/caregiver" className="cmx-btn">← Back</a>
      </div>

      {risk && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-2">Current Risk</h2>
          <div className="text-sm">Score {Number(risk.score).toFixed(2)} · {risk.band}</div>
        </section>
      )}

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-2">Recent BP</h2>
        <div className="text-xs space-y-1">
          {measurements?.bp?.slice(0, 5).map((bp: any, i: number) => (
            <div key={i}>{bp.date} · {bp.systolic}/{bp.diastolic}</div>
          ))}
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-2">Recent Weight</h2>
        <div className="text-xs space-y-1">
          {measurements?.weight?.slice(0, 5).map((w: any, i: number) => (
            <div key={i}>{w.date} · {w.kg} kg</div>
          ))}
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-2">Care Team Notes</h2>
        <div className="text-xs space-y-1">
          {collaboration?.notes?.slice(0, 5).map((n: any) => (
            <div key={n.id}>{new Date(n.createdAt).toLocaleDateString()} · {n.body}</div>
          ))}
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-2">Tasks</h2>
        <div className="text-xs space-y-1">
          {collaboration?.tasks?.slice(0, 5).map((t: any) => (
            <div key={t.id}>{t.title} · {t.status}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
