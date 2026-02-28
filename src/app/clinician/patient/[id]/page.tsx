'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { bandColor } from '@/lib/ui';

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', detail: '', dueDate: '' });
  const [messageBody, setMessageBody] = useState('');

  useEffect(() => {
    if (!patientId) return;
    fetch(`/api/clinician/patient/${patientId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  async function refreshCollaboration() {
    const updated = await fetch(`/api/clinician/patient/${patientId}`).then(r => r.json());
    setData(updated);
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl p-6"><div className="cmx-card p-4">Loading...</div></main>;
  }

  if (!data) {
    return <main className="mx-auto max-w-4xl p-6"><div className="cmx-card p-4">Patient not found</div></main>;
  }

  const { patient, risk, riskTrend, measurements, adherence, nudges, collaboration } = data;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{patient.name}</h1>
          <p className="text-sm text-gray-600">{patient.email}</p>
        </div>
        <a href="/clinician" className="cmx-btn">← Back to Dashboard</a>
      </div>

      {risk && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Current Risk</h2>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">{Number(risk.score).toFixed(2)}</span>
            <span className={`cmx-badge ${bandColor(risk.band)}`}>{risk.band.toUpperCase()}</span>
            <span className="text-sm text-gray-600">As of {risk.date}</span>
          </div>
          {risk.drivers && risk.drivers.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Top Drivers:</div>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                {risk.drivers.map((d: any, i: number) => (
                  <li key={i}>{d.feature}: {d.direction} ({Number(d.contribution).toFixed(3)})</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {riskTrend && riskTrend.length > 0 && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Risk Trend (30 days)</h2>
          <div className="flex items-end gap-1 h-32 border-b border-cmx-line">
            {riskTrend.map((point: any, i: number) => {
              const height = Math.round(point.score * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className={`w-full ${
                      point.band === 'green' ? 'bg-cmx-risk-green' :
                      point.band === 'amber' ? 'bg-cmx-risk-amber' :
                      'bg-cmx-risk-red'
                    }`}
                    style={{ height: `${Math.max(height, 5)}%`, minHeight: '4px' }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {adherence && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Engagement</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Nudge Completion Rate</span>
              <span className="font-medium">{adherence.adherenceRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full"
                style={{ width: `${adherence.adherenceRate}%` }}
              />
            </div>
            <div className="text-xs text-gray-600">
              {adherence.completedNudges} of {adherence.totalNudges} completed
            </div>
          </div>
        </section>
      )}

      {measurements && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Recent Measurements</h2>
          {measurements.bp && measurements.bp.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Blood Pressure</div>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {measurements.bp.slice(0, 10).map((bp: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-24">{bp.date}</span>
                    <span>{bp.systolic}/{bp.diastolic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {nudges && nudges.length > 0 && (
        <section className="cmx-card p-4">
          <h2 className="font-medium mb-3">Recent Nudges</h2>
          <div className="space-y-2 text-sm">
            {nudges.slice(0, 10).map((n: any, i: number) => (
              <div key={i} className="flex items-start justify-between border-b border-cmx-line pb-2">
                <div className="flex-1">
                  <div className="font-medium">{n.message}</div>
                  <div className="text-xs text-gray-600">{n.date} · {n.category}</div>
                </div>
                <div className="text-xs">
                  {n.status === 'completed' && <span className="text-green-600">✓ Completed</span>}
                  {n.status === 'skipped' && <span className="text-gray-500">Skipped</span>}
                  {n.status === 'sent' && <span className="text-gray-400">Pending</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Clinician Notes</h2>
        <div className="space-y-2 mb-4">
          {(collaboration?.notes || []).map((n: any) => (
            <div key={n.id} className="border border-cmx-line rounded p-3 text-sm">
              <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
              <div className="mt-1">{n.body}</div>
            </div>
          ))}
          {(!collaboration?.notes || collaboration.notes.length === 0) && (
            <div className="text-sm text-gray-500">No notes yet.</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <textarea
            className="border border-cmx-line rounded px-3 py-2 text-sm"
            placeholder="Add a clinician note..."
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button
            className="cmx-btn w-fit"
            onClick={async () => {
              if (!noteBody.trim()) return;
              await fetch('/api/clinician/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, body: noteBody }),
              });
              setNoteBody('');
              await refreshCollaboration();
            }}
          >
            Save Note
          </button>
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Care Tasks</h2>
        <div className="space-y-2 mb-4">
          {(collaboration?.tasks || []).map((t: any) => (
            <div key={t.id} className="border border-cmx-line rounded p-3 text-sm flex items-start justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                {t.detail ? <div className="text-gray-600 mt-1">{t.detail}</div> : null}
                {t.dueDate ? <div className="text-xs text-gray-500 mt-1">Due {t.dueDate}</div> : null}
              </div>
              <button
                className="cmx-btn"
                onClick={async () => {
                  await fetch(`/api/clinician/tasks/${t.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: t.status === 'done' ? 'open' : 'done' }),
                  });
                  await refreshCollaboration();
                }}
              >
                {t.status === 'done' ? 'Reopen' : 'Mark done'}
              </button>
            </div>
          ))}
          {(!collaboration?.tasks || collaboration.tasks.length === 0) && (
            <div className="text-sm text-gray-500">No tasks yet.</div>
          )}
        </div>
        <div className="grid gap-2">
          <input
            className="border border-cmx-line rounded px-3 py-2 text-sm"
            placeholder="Task title"
            value={taskForm.title}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
          />
          <input
            className="border border-cmx-line rounded px-3 py-2 text-sm"
            placeholder="Task detail (optional)"
            value={taskForm.detail}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, detail: e.target.value }))}
          />
          <input
            className="border border-cmx-line rounded px-3 py-2 text-sm"
            placeholder="Due date (YYYY-MM-DD)"
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
          <button
            className="cmx-btn w-fit"
            onClick={async () => {
              if (!taskForm.title.trim()) return;
              await fetch('/api/clinician/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, ...taskForm }),
              });
              setTaskForm({ title: '', detail: '', dueDate: '' });
              await refreshCollaboration();
            }}
          >
            Add Task
          </button>
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Secure Messages</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto border border-cmx-line rounded p-3 text-sm">
          {(collaboration?.messages || []).map((m: any) => (
            <div key={m.id} className="flex flex-col">
              <div className="text-xs text-gray-500">
                {m.authorRole} · {new Date(m.createdAt).toLocaleString()}
              </div>
              <div className="mt-1">{m.body}</div>
            </div>
          ))}
          {(!collaboration?.messages || collaboration.messages.length === 0) && (
            <div className="text-sm text-gray-500">No messages yet.</div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            className="border border-cmx-line rounded px-3 py-2 text-sm flex-1"
            placeholder="Write a message..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
          <button
            className="cmx-btn"
            onClick={async () => {
              if (!messageBody.trim()) return;
              await fetch('/api/clinician/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId, body: messageBody }),
              });
              setMessageBody('');
              await refreshCollaboration();
            }}
          >
            Send
          </button>
        </div>
      </section>
    </main>
  );
}




