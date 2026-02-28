'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CaregiverAcceptPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Accepting invite…');

  useEffect(() => {
    if (!token) {
      setStatus('Missing token.');
      return;
    }
    fetch('/api/caregiver/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatus('Invite accepted! You can now access the caregiver dashboard.');
        } else {
          setStatus(data.error || 'Failed to accept invite.');
        }
      })
      .catch(() => setStatus('Failed to accept invite.'));
  }, [token]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="cmx-card p-4">{status}</div>
      <a className="cmx-link text-sm mt-3 inline-block" href="/caregiver">
        Go to Caregiver Dashboard
      </a>
    </main>
  );
}
