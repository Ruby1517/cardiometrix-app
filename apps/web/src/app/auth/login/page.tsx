'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { setWebAuthToken } from '@/lib/webToken';

export default function LoginPage(){
  const r = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const jwt = searchParams.get('jwt');
    const next = searchParams.get('next') || '/';
    if (!jwt) return;
    setWebAuthToken(jwt);
    r.replace(next);
  }, [r, searchParams]);

  async function submit(e: React.FormEvent){
    e.preventDefault(); setLoading(true); setErr('');
    const res = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    if (!res.ok) { const j = await res.json(); setErr(j.error||'Failed'); setLoading(false); return; }
    const json = await res.json();
    if (!json?.token) {
      setErr('Missing token in response');
      setLoading(false);
      return;
    }
    setWebAuthToken(json.token);
    r.push('/');
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-xl font-semibold">Web Portal Login</h1>
      <p className="text-sm opacity-80">
        This portal is primarily for clinician/admin workflows. Patients should use the mobile app for daily use.
      </p>
      <form className="space-y-3" onSubmit={submit}>
        <input className="border p-2 rounded w-full" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input className="border p-2 rounded w-full" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button disabled={loading} className="border px-3 py-1 rounded w-full">{loading?'Logging in...':'Log in to Portal'}</button>
      </form>
      <a
        className="border px-3 py-2 rounded w-full block text-center"
        href="/api/auth/google/start?next=/"
      >
        Continue with Google
      </a>
      <p className="text-sm opacity-70">Need a web account? Use staff onboarding via admin/IT.</p>
    </main>
  );
}
