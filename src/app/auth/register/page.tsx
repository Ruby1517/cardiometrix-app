'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage(){
  const r = useRouter();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent){
    e.preventDefault(); setLoading(true); setErr('');
    const res = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    if (!res.ok) { const j = await res.json(); setErr(j.error||'Failed'); setLoading(false); return; }
    r.push('/');
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <form className="space-y-3" onSubmit={submit}>
        <input className="border p-2 rounded w-full" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        <input className="border p-2 rounded w-full" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        <input className="border p-2 rounded w-full" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button disabled={loading} className="border px-3 py-1 rounded w-full">{loading?'Creating...':'Sign up'}</button>
      </form>
      <p className="text-sm">Have an account? <a className="underline" href="/auth/login">Log in</a></p>
    </main>
  );
}