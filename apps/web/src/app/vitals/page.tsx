'use client';
import { useEffect, useState } from 'react';
import { GoalsCard } from '@/components/GoalsCard';
import { RemindersCard } from '@/components/RemindersCard';
import { MeasurementForm } from '@/components/MeasurementForm';
import { LabsSummary } from '@/components/LabsSummary';
import { CarePlanCard } from '@/components/CarePlanCard';
import { MedicationInsightsCard } from '@/components/MedicationInsightsCard';
import { AnomalyCard } from '@/components/AnomalyCard';
import { DataQualityCard } from '@/components/DataQualityCard';
import { CohortComparisonCard } from '@/components/CohortComparisonCard';
import { CaregiverInviteCard } from '@/components/CaregiverInviteCard';

type UserSummary = {
  id: string;
  name: string;
  role: 'patient' | 'clinician' | 'admin';
};

export default function VitalsPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setUser(data.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">Loading…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Vitals</h1>
        <section className="cmx-card p-4">
          <p className="opacity-80">Sign in to manage your vitals, labs, and goals.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Vitals</h1>
            <p className="text-sm opacity-70 mt-1">All your measurements, goals, and reminders in one place.</p>
          </div>
          <button className="cmx-btn" onClick={() => setShowAdd(true)}>Add measurement</button>
        </div>
      </header>
      <div className="grid gap-6">
        <GoalsCard />
        <CarePlanCard />
        <AnomalyCard />
        <DataQualityCard />
        <CohortComparisonCard />
        <MedicationInsightsCard />
        <CaregiverInviteCard />
        <RemindersCard />
        <LabsSummary />
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl cmx-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Add Measurement</h2>
              <button className="cmx-btn" onClick={() => setShowAdd(false)}>Close</button>
            </div>
            <MeasurementForm
              onSaved={() => {
                setShowAdd(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
