'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearWebAuthToken } from '@/lib/webToken';

type NavUser = {
  id: string;
  name: string;
  role: 'patient' | 'clinician' | 'admin';
};

export default function ClientNav(){
  const [user, setUser] = useState<NavUser | null>(null);
  const pathname = usePathname();
  useEffect(()=>{
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r=>r.json()).then(j=>setUser(j.user||null)).catch(()=>{});
  },[pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-cmx-line bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">Cardiometrix</Link>
        <nav className="text-sm">
          {!user ? (
            <div className="space-x-3">
              <Link className="cmx-link" href="/auth/login">Portal Log in</Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-3 text-sm">
                <Link className="cmx-link" href="/">Home</Link>
                {user.role === 'patient' ? (
                  <>
                    <Link className="cmx-link" href="/caregiver">Caregiver</Link>
                  </>
                ) : null}
                {(user.role === 'clinician' || user.role === 'admin') ? (
                  <>
                    <Link className="cmx-link" href="/clinician">Clinician</Link>
                    <Link className="cmx-link" href="/collaboration">Care Team</Link>
                    <Link className="cmx-link" href="/trends">Trends</Link>
                    <Link className="cmx-link" href="/insights">Insights</Link>
                  </>
                ) : null}
                {user.role === 'admin' && (
                  <Link className="cmx-link" href="/admin">Admin</Link>
                )}
              </nav>
              <span className="opacity-80">{user.name} · {user.role}</span>
              <form action="/api/auth/logout" method="post" onSubmit={(e)=>{e.preventDefault(); clearWebAuthToken(); fetch('/api/auth/logout',{method:'POST'}).then(()=>location.reload());}}>
                <button className="cmx-btn" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
