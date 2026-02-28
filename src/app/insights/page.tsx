'use client';
import { useEffect, useState } from 'react';

export default function InsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nudges/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">Loading insights...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">No data available yet. Complete some nudges to see insights!</div>
      </main>
    );
  }

  const { categoryStats, recentNudges, summary } = data;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Insights</h1>

      {summary && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Overall Completion</div>
              <div className="text-2xl font-bold">{summary.overallCompletionRate}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Categories</div>
              <div className="text-2xl font-bold">{summary.totalCategories}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Best Category</div>
              <div className="text-xl font-semibold capitalize">{summary.bestCategory || 'N/A'}</div>
            </div>
          </div>
        </section>
      )}

      {categoryStats && categoryStats.length > 0 && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">What Works Best For You</h2>
          <div className="space-y-4">
            {categoryStats.map((stat: any, i: number) => (
              <div key={i} className="border-b border-cmx-line pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium capitalize">{stat.category}</div>
                    <div className="text-sm text-gray-600">
                      {stat.completed} completed, {stat.skipped} skipped
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{stat.effectivenessScore}%</div>
                    <div className="text-xs text-gray-500">Effectiveness</div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Completion Rate:</span>
                    <span className="font-medium">{stat.completionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Improvement Rate:</span>
                    <span className="font-medium">{stat.improvementRate}%</span>
                    {stat.riskImproved > 0 && (
                      <span className="text-xs text-green-600 ml-2">
                        ({stat.riskImproved} improvements)
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${stat.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentNudges && recentNudges.length > 0 && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Recent Activity</h2>
          <div className="space-y-2 text-sm">
            {recentNudges.slice(0, 10).map((nudge: any, i: number) => (
              <div key={i} className="flex items-start justify-between border-b border-cmx-line pb-2">
                <div className="flex-1">
                  <div>{nudge.message}</div>
                  <div className="text-xs text-gray-600">{nudge.date} · {nudge.category}</div>
                </div>
                <div className="text-xs ml-4">
                  {nudge.status === 'completed' && (
                    <span className="text-green-600">✓ Completed</span>
                  )}
                  {nudge.status === 'skipped' && (
                    <span className="text-gray-500">Skipped</span>
                  )}
                  {nudge.status === 'sent' && (
                    <span className="text-gray-400">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}





