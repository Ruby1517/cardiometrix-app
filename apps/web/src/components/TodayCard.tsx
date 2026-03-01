'use client';
import { bandColor } from '@/lib/ui';
import { useState } from 'react';

type Driver = { feature: string; contribution: number; direction: 'up'|'down' };
export default function TodayCard({ risk, nudge, onRefresh }: { risk: any; nudge: any; onRefresh?: () => void }){
  const [completing, setCompleting] = useState(false);

  async function markComplete(status: 'completed' | 'skipped') {
    if (completing) return;
    setCompleting(true);
    try {
      await fetch('/api/nudges/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Failed to update nudge:', e);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <section className="cmx-card p-4 space-y-3">
      <h2 className="font-medium">Risk</h2>
      {!risk ? (
        <p className="opacity-80">No score yet. Add a BP or weight entry below.</p>
      ) : (
        <div>
          <p>Score: <b>{Number(risk.score).toFixed(2)}</b> — <span className={`cmx-badge ${bandColor(risk.band)}`}>{risk.band}</span></p>
          {risk.drivers?.length ? (
            <ul className="list-disc ml-6 mt-2">
              {risk.drivers.map((d: Driver) => (
                <li key={d.feature}>{d.feature}: {d.direction} ({Number(d.contribution).toFixed(2)})</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="pt-2 border-t border-cmx-line">
        <h3 className="font-medium mb-1">Today's nudge</h3>
        {!nudge ? (
          <p className="opacity-80">No nudge yet.</p>
        ) : (
          <div className="space-y-2">
            <p>{nudge.message}</p>
            {nudge.status === 'sent' && (
              <div className="flex gap-2">
                <button 
                  className="cmx-btn bg-green-600 hover:bg-green-700 text-white" 
                  onClick={() => markComplete('completed')}
                  disabled={completing}
                >
                  {completing ? '...' : '✓ Mark Done'}
                </button>
                <button 
                  className="cmx-btn border border-cmx-line" 
                  onClick={() => markComplete('skipped')}
                  disabled={completing}
                >
                  Skip
                </button>
              </div>
            )}
            {nudge.status === 'completed' && (
              <p className="text-sm text-green-600">✓ Completed</p>
            )}
            {nudge.status === 'skipped' && (
              <p className="text-sm text-gray-500">Skipped</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}