'use client';

import { useEffect, useState } from 'react';

type HomeUser = {
  id: string;
  name: string;
  role: 'patient' | 'clinician' | 'admin';
};

export default function Page() {
  const [user, setUser] = useState<HomeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setUser(j.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <section className="cmx-card p-4">Loading...</section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Cardiometrix</h1>

      {!user ? (
        <section className="cmx-card p-4 space-y-3">
          <p className="opacity-80">
            Mobile app is the primary patient experience. Web is optimized for clinician and admin operations.
          </p>
          <div className="flex gap-3">
            <a className="cmx-btn" href="/auth/login">Log in</a>
            <a className="cmx-btn" href="/auth/register">Create account</a>
          </div>
        </section>
      ) : null}

      {user?.role === 'patient' ? (
        <>
          <section className="cmx-card p-4 space-y-3">
            <h2 className="font-medium">Patient Experience Is Mobile-First</h2>
            <p className="text-sm opacity-80">
              Use the Cardiometrix mobile app to connect devices, log vitals/labs, receive nudges, and get notifications.
            </p>
            <ul className="list-disc ml-6 text-sm opacity-80">
              <li>Device sync and health data import</li>
              <li>Daily risk and nudge workflow</li>
              <li>Medication and reminder interactions</li>
            </ul>
          </section>

          <section className="cmx-card p-4 space-y-2">
            <h3 className="font-medium">Web Access (Optional)</h3>
            <div className="flex flex-wrap gap-3">
              <a className="cmx-btn" href="/caregiver">Caregiver Access</a>
              <p className="text-sm opacity-80">
                For daily check-ins, risk, and nudges, continue in the mobile app.
              </p>
            </div>
          </section>
        </>
      ) : null}

      {(user?.role === 'clinician' || user?.role === 'admin') ? (
        <section className="cmx-card p-4 space-y-3">
          <h2 className="font-medium">Web Dashboard Workspace</h2>
          <p className="text-sm opacity-80">
            This web app is optimized for clinician triage, collaboration, and admin analytics.
          </p>
          <div className="flex flex-wrap gap-3">
            <a className="cmx-btn" href="/clinician">Open Clinician Dashboard</a>
            {user.role === 'admin' ? <a className="cmx-btn" href="/admin">Open Admin</a> : null}
            <a className="cmx-btn" href="/trends">Risk Trends</a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
