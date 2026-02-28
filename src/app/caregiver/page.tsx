'use client';
import { useEffect, useState } from 'react';

type Patient = { id: string; name: string; email: string };

export default function CaregiverPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/caregiver/links', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (active) setPatients(data.patients ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Caregiver Dashboard</h1>
        <p className="text-sm opacity-70 mt-1">Read-only access to linked patients.</p>
      </header>
      {loading ? (
        <div className="cmx-card p-4">Loading…</div>
      ) : patients.length === 0 ? (
        <div className="cmx-card p-4">No linked patients yet.</div>
      ) : (
        <div className="grid gap-3">
          {patients.map((patient) => (
            <a key={patient.id} href={`/caregiver/patient/${patient.id}`} className="cmx-card p-4 block">
              <div className="font-medium">{patient.name}</div>
              <div className="text-sm text-gray-600">{patient.email}</div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
