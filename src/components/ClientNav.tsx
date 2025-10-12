'use client';
import { useEffect, useState } from 'react';

export default function ClientNav(){
  const [user, setUser] = useState<any>(null);
  useEffect(()=>{
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
      .then(r=>r.json()).then(j=>setUser(j.user||null)).catch(()=>{});
  },[]);

  return (
    <header className="sticky top-0 z-40 border-b border-cmx-line bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight">Cardiometrix</a>
        <nav className="text-sm">
          {!user ? (
            <div className="space-x-3">
              <a className="cmx-link" href="/auth/login">Log in</a>
              <a className="cmx-link" href="/auth/register">Sign up</a>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="opacity-80">{user.name} · {user.role}</span>
              <form action="/api/auth/logout" method="post" onSubmit={(e)=>{e.preventDefault(); fetch('/api/auth/logout',{method:'POST'}).then(()=>location.reload());}}>
                <button className="cmx-btn" type="submit">Sign out</button>
              </form>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}