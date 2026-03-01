'use client';
import { useEffect, useState } from 'react';

type CarePlan = {
  weekStart: string;
  weekEnd: string;
  summary: string;
  focusAreas: string[];
  actions: {
    title: string;
    detail: string;
    metric: string;
    target: string;
  }[];
};

type CarePlanResponse = {
  plan: CarePlan | null;
};

export function CarePlanCard() {
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/care-plan', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: CarePlanResponse) => {
        if (active) setPlan(data.plan ?? null);
      })
      .catch(() => {
        if (active) setPlan(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="cmx-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Weekly Care Plan</h2>
        {plan ? (
          <span className="text-xs opacity-70">
            {plan.weekStart} — {plan.weekEnd}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm opacity-70">Building your plan…</p>
      ) : !plan ? (
        <p className="text-sm opacity-70">Log a few vitals to unlock a weekly plan.</p>
      ) : (
        <>
          <p className="text-sm text-gray-700">{plan.summary}</p>
          <div className="space-y-3">
            {plan.actions.map((action, index) => (
              <div key={`${action.title}-${index}`} className="border border-cmx-line rounded-lg p-3">
                <div className="font-medium">{action.title}</div>
                <p className="text-sm text-gray-600 mt-1">{action.detail}</p>
                <div className="text-xs text-gray-500 mt-2">
                  {action.metric} · {action.target}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
