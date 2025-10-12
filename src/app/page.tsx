// 'use client';
// import { useEffect, useState } from 'react';

// export default function Page() {
//   const [user, setUser] = useState<any>(null);
//   const [risk, setRisk] = useState<any>(null);
//   const [nudge, setNudge] = useState<any>(null);
//   const [bp, setBp] = useState({ systolic: '', diastolic: '', pulse: '' });
//   const [weight, setWeight] = useState('');

//   async function refresh() {
//     const me = await fetch('/api/auth/me').then(r=>r.json());
//     setUser(me.user);
//     if (!me.user) return;
//     const r = await fetch('/api/risk/today').then(r=>r.json());
//     setRisk(r.today);
//     const n = await fetch('/api/nudges/today').then(r=>r.json());
//     setNudge(n.nudge);
//   }

//   async function addBp() {
//     await fetch('/api/measurements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
//       type: 'bp', measuredAt: new Date().toISOString(), payload: { systolic: Number(bp.systolic), diastolic: Number(bp.diastolic), pulse: Number(bp.pulse)||undefined }, source: 'manual'
//     })});
//     await fetch('/api/features/recompute', { method: 'POST' });
//     await fetch('/api/risk/compute', { method: 'POST' });
//     await refresh();
//   }

//   async function addWeight() {
//     await fetch('/api/measurements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
//       type: 'weight', measuredAt: new Date().toISOString(), payload: { kg: Number(weight) }, source: 'manual'
//     })});
//     await fetch('/api/features/recompute', { method: 'POST' });
//     await fetch('/api/risk/compute', { method: 'POST' });
//     await refresh();
//   }

//   useEffect(()=>{ refresh(); },[]);

//   return (
//     <main className="mx-auto max-w-xl p-6 space-y-6">
//       <header className="flex items-center justify-between">
//         <h1 className="text-2xl font-semibold">Cardiometrix — Today</h1>
//         <nav className="text-sm">
//           {!user ? (
//             <div className="space-x-3">
//               <a className="underline" href="/auth/login">Log in</a>
//               <a className="underline" href="/auth/register">Sign up</a>
//             </div>
//           ) : (
//             <span className="opacity-80">{user.name} · {user.role}</span>
//           )}
//         </nav>
//       </header>

//       {!user ? (
//         <section className="border rounded-xl p-4">
//           <p>Please <a className="underline" href="/auth/login">log in</a> or <a className="underline" href="/auth/register">create an account</a> to start.</p>
//         </section>
//       ) : (
//         <>
//           <section className="border rounded-xl p-4">
//             <h2 className="font-medium mb-2">Risk</h2>
//             {!risk ? <p>No score yet.</p> : (
//               <div>
//                 <p>Score: <b>{risk.score?.toFixed(2)}</b> — <b className="uppercase">{risk.band}</b></p>
//                 <ul className="list-disc ml-6 mt-2">
//                   {(risk.drivers||[]).map((d:any)=> <li key={d.feature}>{d.feature}: {d.direction} ({d.contribution.toFixed(2)})</li>)}
//                 </ul>
//               </div>
//             )}
//           </section>

//           <section className="border rounded-xl p-4">
//             <h2 className="font-medium mb-2">Today’s nudge</h2>
//             {!nudge ? <p>No nudge yet.</p> : (
//               <div>
//                 <p>{nudge.message}</p>
//                 <button className="mt-2 border px-3 py-1 rounded" onClick={async()=>{ await fetch('/api/nudges/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'completed'})}); await refresh(); }}>Mark done</button>
//               </div>
//             )}
//           </section>

//           <section className="border rounded-xl p-4 space-y-3">
//             <h2 className="font-medium">Add BP</h2>
//             <div className="flex gap-2">
//               <input className="border p-2 rounded w-24" placeholder="SYS" value={bp.systolic} onChange={e=>setBp(p=>({...p,systolic:e.target.value}))} />
//               <input className="border p-2 rounded w-24" placeholder="DIA" value={bp.diastolic} onChange={e=>setBp(p=>({...p,diastolic:e.target.value}))} />
//               <input className="border p-2 rounded w-24" placeholder="Pulse" value={bp.pulse} onChange={e=>setBp(p=>({...p,pulse:e.target.value}))} />
//               <button className="border px-3 rounded" onClick={addBp}>Save</button>
//             </div>
//           </section>

//           <section className="border rounded-xl p-4 space-y-3">
//             <h2 className="font-medium">Add Weight (kg)</h2>
//             <div className="flex gap-2">
//               <input className="border p-2 rounded w-24" placeholder="e.g. 78.4" value={weight} onChange={e=>setWeight(e.target.value)} />
//               <button className="border px-3 rounded" onClick={addWeight}>Save</button>
//             </div>
//           </section>

//           <section className="border rounded-xl p-4">
//             <h2 className="font-medium mb-2">Share with clinician</h2>
//             <button className="border px-3 py-1 rounded" onClick={async()=>{
//               const r = await fetch('/api/clinician/share', { method: 'POST' }).then(r=>r.json());
//               if (r.url) alert('Share link: '+r.url);
//             }}>Create link</button>
//           </section>
//         </>
//       )}
//     </main>
//   );
// }
'use client';
import { useEffect, useState } from 'react';
import TodayCard from '@/components/TodayCard';
import { MeasurementForm } from '@/components/MeasurementForm';

export default function Page(){
  const [user, setUser] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [nudge, setNudge] = useState<any>(null);

  async function refresh(){
    const me = await fetch('/api/auth/me', { cache:'no-store', credentials:'include' }).then(r=>r.json());
    setUser(me.user ?? null);
    if (me.user) {
      const r = await fetch('/api/risk/today', { cache:'no-store' }).then(r=>r.json());
      setRisk(r.today ?? null);
      const n = await fetch('/api/nudges/today', { cache:'no-store' }).then(r=>r.json());
      setNudge(n.nudge ?? null);
    } else { setRisk(null); setNudge(null); }
  }

  useEffect(()=>{ refresh(); },[]);

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Cardiometrix — Today</h1>
      {!user ? (
        <section className="cmx-card p-4"><p className="opacity-80">Welcome! Sign in from the navbar to view your risk and daily nudge.</p></section>
      ) : (
        <>
          <TodayCard risk={risk} nudge={nudge} />
          <MeasurementForm onSaved={refresh} />
          <section className="cmx-card p-4">
            <h2 className="font-medium mb-2">Share with clinician</h2>
            <button className="cmx-btn" onClick={async()=>{
              const r = await fetch('/api/clinician/share',{method:'POST'}).then(r=>r.json());
              if (r.url) alert('Share link: '+r.url);
            }}>Create link</button>
          </section>
        </>
      )}
    </main>
  );
}
