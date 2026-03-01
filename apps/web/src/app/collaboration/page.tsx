'use client';
import { useCallback, useEffect, useState } from 'react';

type Note = { id: string; body: string; createdAt: string };
type Task = { id: string; title: string; detail?: string; status: string; dueDate?: string; createdAt: string };
type Message = { id: string; body: string; authorRole: string; createdAt: string };
type UserSummary = { id: string; role: 'patient' | 'clinician' | 'admin' };

export default function CollaborationPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState('');

  const loadCollaboration = useCallback(async (patientId: string) => {
    const [notesRes, tasksRes, messagesRes] = await Promise.all([
      fetch(`/api/clinician/notes?patientId=${patientId}`).then((r) => r.json()),
      fetch(`/api/clinician/tasks?patientId=${patientId}`).then((r) => r.json()),
      fetch(`/api/clinician/messages?patientId=${patientId}`).then((r) => r.json()),
    ]);
    setNotes(notesRes.notes ?? []);
    setTasks(tasksRes.tasks ?? []);
    setMessages(messagesRes.messages ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setUser(data.user ?? null);
        if (data.user?.id) {
          loadCollaboration(data.user.id);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadCollaboration]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="cmx-card p-4">Loading…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Care Team</h1>
        <section className="cmx-card p-4">
          <p className="opacity-80">Sign in to view clinician notes, tasks, and messages.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Care Team</h1>
        <p className="text-sm opacity-70 mt-1">Clinician notes, tasks, and secure messages.</p>
      </header>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Notes</h2>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border border-cmx-line rounded p-3 text-sm">
                <div className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</div>
                <div className="mt-1">{note.body}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Tasks</h2>
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks assigned yet.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="border border-cmx-line rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{task.title}</div>
                  <span className="text-xs text-gray-500">{task.status}</span>
                </div>
                {task.detail ? <div className="text-gray-600 mt-1">{task.detail}</div> : null}
                {task.dueDate ? <div className="text-xs text-gray-500 mt-1">Due {task.dueDate}</div> : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="cmx-card p-4">
        <h2 className="font-medium mb-3">Messages</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto border border-cmx-line rounded p-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <div className="text-xs text-gray-500">
                  {msg.authorRole} · {new Date(msg.createdAt).toLocaleString()}
                </div>
                <div className="mt-1">{msg.body}</div>
              </div>
            ))
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
                body: JSON.stringify({ patientId: user.id, body: messageBody }),
              });
              setMessageBody('');
              await loadCollaboration(user.id);
            }}
          >
            Send
          </button>
        </div>
      </section>
    </main>
  );
}
