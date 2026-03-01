'use client';
import { useState } from 'react';

export function CaregiverInviteCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  return (
    <section className="cmx-card p-4 space-y-3">
      <h2 className="font-medium">Caregiver Access</h2>
      <p className="text-sm text-gray-600">Invite a caregiver to view your summary and care team notes.</p>
      <div className="flex flex-wrap gap-2">
        <input
          className="border border-cmx-line rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="caregiver@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="cmx-btn"
          onClick={async () => {
            setStatus('');
            if (!email.trim()) return;
            const res = await fetch('/api/caregiver/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            }).then((r) => r.json());
            if (res.url) {
              setInviteUrl(res.url);
              await navigator.clipboard.writeText(res.url);
              setStatus('Invite link copied to clipboard.');
            }
          }}
        >
          Send Invite
        </button>
      </div>
      {inviteUrl ? (
        <div className="text-xs text-gray-500">Invite link: {inviteUrl}</div>
      ) : null}
      {status ? <div className="text-xs text-gray-500">{status}</div> : null}
    </section>
  );
}
