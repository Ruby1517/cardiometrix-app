'use client';
import { useEffect, useState } from 'react';
import { bandColor } from '@/lib/ui';

type PatientRow = {
  id: string;
  name: string;
  email: string;
  risk: 'green' | 'amber' | 'red' | null;
  score: number | null;
  date: string | null;
  adherence: number | null;
  trend: 'improving' | 'stable' | 'worsening' | null;
};

export default function ClinicianDashboard() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [query, setQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/clinician/patients', { cache: 'no-store' });
      if (!r.ok) throw new Error('Not authorized');
      const j = await r.json();
      setRows((j.rows || []) as PatientRow[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (query) {
      const q = query.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterRisk && r.risk !== filterRisk) {
      return false;
    }
    return true;
  });

  const stats = {
    total: rows.length,
    red: rows.filter(r => r.risk === 'red').length,
    amber: rows.filter(r => r.risk === 'amber').length,
    green: rows.filter(r => r.risk === 'green').length,
    highAdherence: rows.filter(r => r.adherence !== null && r.adherence >= 70).length,
  };

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clinician Dashboard</h1>
        <button className="cmx-btn" onClick={load}>Refresh</button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="cmx-card p-4">
          <div className="text-sm text-gray-600">Total Patients</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="cmx-card p-4">
          <div className="text-sm text-gray-600">Red Risk</div>
          <div className="text-2xl font-bold text-red-600">{stats.red}</div>
        </div>
        <div className="cmx-card p-4">
          <div className="text-sm text-gray-600">Amber Risk</div>
          <div className="text-2xl font-bold text-amber-600">{stats.amber}</div>
        </div>
        <div className="cmx-card p-4">
          <div className="text-sm text-gray-600">Green Risk</div>
          <div className="text-2xl font-bold text-green-600">{stats.green}</div>
        </div>
        <div className="cmx-card p-4">
          <div className="text-sm text-gray-600">High Adherence</div>
          <div className="text-2xl font-bold text-blue-600">{stats.highAdherence}</div>
          <div className="text-xs text-gray-500">≥70%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="cmx-card p-4 flex gap-3 flex-wrap">
        <input
          className="border border-cmx-line rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="Search name, email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border border-cmx-line rounded px-3 py-2 text-sm"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
        >
          <option value="">All Risk Levels</option>
          <option value="red">Red</option>
          <option value="amber">Amber</option>
          <option value="green">Green</option>
        </select>
      </div>

      {/* Patient Table */}
      {loading ? (
        <div className="cmx-card p-4">Loading…</div>
      ) : error ? (
        <div className="cmx-card p-4 text-red-600">{error}</div>
      ) : (
        <div className="cmx-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Risk</th>
                <th className="text-right p-3">Score</th>
                <th className="text-left p-3">Adherence</th>
                <th className="text-left p-3">Trend</th>
                <th className="text-left p-3">As of</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center opacity-70">
                    No patients found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-cmx-line hover:bg-gray-50">
                    <td className="p-3">{r.name}</td>
                    <td className="p-3">{r.email}</td>
                    <td className="p-3">
                      {!r.risk ? (
                        <span className="opacity-60">—</span>
                      ) : (
                        <span
                          className={`cmx-badge ${
                            r.risk === 'green'
                              ? 'bg-cmx-risk-green'
                              : r.risk === 'amber'
                              ? 'bg-cmx-risk-amber'
                              : 'bg-cmx-risk-red'
                          }`}
                        >
                          {r.risk}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {r.score == null ? '—' : Number(r.score).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {r.adherence == null ? '—' : (
                        <div className="flex items-center gap-2">
                          <span>{r.adherence}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                r.adherence >= 70 ? 'bg-green-600' :
                                r.adherence >= 50 ? 'bg-amber-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${r.adherence}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {r.trend === 'improving' && <span className="text-green-600">↓ Improving</span>}
                      {r.trend === 'worsening' && <span className="text-red-600">↑ Worsening</span>}
                      {r.trend === 'stable' && <span className="text-gray-600">→ Stable</span>}
                      {!r.trend && <span className="opacity-60">—</span>}
                    </td>
                    <td className="p-3">{r.date || '—'}</td>
                    <td className="p-3">
                      <a 
                        href={`/clinician/patient/${r.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}





