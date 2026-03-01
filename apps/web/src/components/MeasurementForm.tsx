'use client';
import { useState } from 'react';

export function MeasurementForm({ onSaved }:{ onSaved: ()=>void }){
  const [bp, setBp] = useState({ systolic: '', diastolic: '', pulse: '' });
  const [weight, setWeight] = useState('');
  const [a1c, setA1c] = useState('');
  const [lipid, setLipid] = useState({ total: '', ldl: '', hdl: '', triglycerides: '' });

  async function saveAndRefresh() {
    await fetch('/api/features/recompute', { method:'POST' });
    await fetch('/api/risk/compute', { method:'POST' });
    await fetch('/api/nudges/compute', { method:'POST' });
    onSaved();
  }

  async function addVitals(){
    const hasBp = bp.systolic && bp.diastolic;
    const hasWeight = Boolean(weight);
    if (!hasBp && !hasWeight) return;
    const measuredAt = new Date().toISOString();
    if (hasBp) {
      await fetch('/api/measurements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        type:'bp', measuredAt, payload:{ systolic:Number(bp.systolic), diastolic:Number(bp.diastolic), pulse: bp.pulse?Number(bp.pulse):undefined }, source:'manual'
      })});
      setBp({ systolic:'', diastolic:'', pulse:'' });
    }
    if (hasWeight) {
      await fetch('/api/measurements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        type:'weight', measuredAt, payload:{ kg:Number(weight) }, source:'manual'
      })});
      setWeight('');
    }
    await saveAndRefresh();
  }

  async function addLabs(){
    const hasA1c = Boolean(a1c);
    const hasLipid = Boolean(lipid.total);
    if (!hasA1c && !hasLipid) return;
    const measuredAt = new Date().toISOString();
    if (hasA1c) {
      await fetch('/api/measurements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        type:'a1c', measuredAt, payload:{ percent:Number(a1c) }, source:'manual'
      })});
      setA1c('');
    }
    if (hasLipid) {
      const payload: any = { total: Number(lipid.total) };
      if (lipid.ldl) payload.ldl = Number(lipid.ldl);
      if (lipid.hdl) payload.hdl = Number(lipid.hdl);
      if (lipid.triglycerides) payload.triglycerides = Number(lipid.triglycerides);
      await fetch('/api/measurements', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
        type:'lipid', measuredAt, payload, source:'manual'
      })});
      setLipid({ total: '', ldl: '', hdl: '', triglycerides: '' });
    }
    onSaved();
  }

  return (
    <section className="cmx-card p-4 space-y-4">
      <h2 className="font-medium">Add Measurements</h2>

      <div className="space-y-2">
        <div className="text-sm font-medium">Blood Pressure</div>
        <div className="flex gap-2 flex-wrap">
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="Systolic" value={bp.systolic} onChange={e=>setBp(p=>({...p, systolic: e.target.value}))} />
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="Diastolic" value={bp.diastolic} onChange={e=>setBp(p=>({...p, diastolic: e.target.value}))} />
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="Pulse" value={bp.pulse} onChange={e=>setBp(p=>({...p, pulse: e.target.value}))} />
          <button className="cmx-btn" onClick={addVitals}>Save</button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Weight (kg)</div>
        <div className="flex gap-2">
          <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="e.g. 78.4" value={weight} onChange={e=>setWeight(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2 border-t border-cmx-line pt-2">
        <div className="text-sm font-medium text-gray-600">Lab Results (Optional)</div>
        
        <div className="space-y-2">
          <div className="text-xs">HbA1c (%)</div>
          <div className="flex gap-2">
            <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="e.g. 5.8" value={a1c} onChange={e=>setA1c(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs">Lipid Panel (mg/dL)</div>
          <div className="flex gap-2 flex-wrap">
            <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="Total" value={lipid.total} onChange={e=>setLipid(p=>({...p, total: e.target.value}))} />
            <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="LDL" value={lipid.ldl} onChange={e=>setLipid(p=>({...p, ldl: e.target.value}))} />
            <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="HDL" value={lipid.hdl} onChange={e=>setLipid(p=>({...p, hdl: e.target.value}))} />
            <input className="border border-cmx-line rounded px-2 py-2 w-24" placeholder="Triglycerides" value={lipid.triglycerides} onChange={e=>setLipid(p=>({...p, triglycerides: e.target.value}))} />
          </div>
        </div>
        <div>
          <button className="cmx-btn" onClick={addLabs}>Save Labs</button>
        </div>
      </div>
    </section>
  );
}
