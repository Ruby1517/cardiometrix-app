'use client';
import { useState } from 'react';

export function MeasurementForm({ onSaved }:{ onSaved: ()=>void }){
  const [bp, setBp] = useState({ systolic: '', diastolic: '', pulse: '' });
  const [weight, setWeight] = useState('');

  async function addBp(){
    if (!bp.systolic || !bp.diastolic) return;
    await fetch('/api/measurements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      type:'bp', measuredAt: new Date().toISOString(), payload:{ systolic:Number(bp.systolic), diastolic:Number(bp.diastolic), pulse: bp.pulse?Number(bp.pulse):undefined }, source:'manual'
    })});
    await fetch('/api/features/recompute', { method:'POST' });
    await fetch('/api/risk/compute', { method:'POST' });
    setBp({ systolic:'', diastolic:'', pulse:'' });
    onSaved();
  }

  async function addWeight(){
    if (!weight) return;
    await fetch('/api/measurements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      type:'weight', measuredAt: new Date().toISOString(), payload:{ kg:Number(weight) }, source:'manual'
    })});
    await fetch('/api/features/recompute', { method:'POST' });
    await fetch('/api/risk/compute', { method:'POST' });
    setWeight('');
    onSaved();
  }

  return (
    <section className="cmx-card p-4 space-y-3">
      <h2 className="font-medium">Add Measurements</h2>

      <div className="space-y-2">
        <div className="text-sm font-medium">Blood Pressure</div>
        <div className="flex gap-2">
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="SYS" value={bp.systolic} onChange={e=>setBp(p=>({...p, systolic: e.target.value}))} />
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="DIA" value={bp.diastolic} onChange={e=>setBp(p=>({...p, diastolic: e.target.value}))} />
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="Pulse" value={bp.pulse} onChange={e=>setBp(p=>({...p, pulse: e.target.value}))} />
          <button className="cmx-btn" onClick={addBp}>Save</button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Weight (kg)</div>
        <div className="flex gap-2">
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="e.g. 78.4" value={weight} onChange={e=>setWeight(e.target.value)} />
          <button className="cmx-btn" onClick={addWeight}>Save</button>
        </div>
      </div>
    </section>
  );
}