import { bandColor } from '@/lib/ui';

type Driver = { feature: string; contribution: number; direction: 'up'|'down' };
export default function TodayCard({ risk, nudge }: { risk: any; nudge: any }){
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
        <h3 className="font-medium mb-1">Today’s nudge</h3>
        {!nudge ? <p className="opacity-80">No nudge yet.</p> : <p>{nudge.message}</p>}
      </div>
    </section>
  );
}