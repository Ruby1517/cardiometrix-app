'use client';
import { useEffect, useState } from 'react';

type Row = {
  id: string;
  name: string;
  email: string;
  risk: 'green' | 'amber' | 'red' | null;
  score: number | null;
  date: string | null;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/patients', { cache: 'no-store' });
      if (!r.ok) throw new Error('Not authorized');
      const j = await r.json();
      setRows((j.rows || []) as Row[]);
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
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.risk ?? '').toString().toLowerCase().includes(q)
    );
  });

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <div className="flex items-center gap-2">
          <input
            className="border border-cmx-line rounded px-3 py-2 text-sm"
            placeholder="Search name, email, risk…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="cmx-btn" onClick={load}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="cmx-card p-4">Loading…</div>
      ) : error ? (
        <div className="cmx-card p-4 text-red-600">{error}</div>
      ) : (
        <div className="cmx-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Risk</th>
                <th className="text-right p-2">Score</th>
                <th className="text-left p-2">As of</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center opacity-70">
                    No patients found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-cmx-line">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.email}</td>
                    <td className="p-2">
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
                    <td className="p-2 text-right">
                      {r.score == null ? '—' : Number(r.score).toFixed(2)}
                    </td>
                    <td className="p-2">{r.date || '—'}</td>
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
