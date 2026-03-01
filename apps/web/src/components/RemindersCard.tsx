'use client';
import { useEffect, useState } from 'react';

type Reminder = {
  id?: string;
  type: 'vitals' | 'meds';
  time: string;
  enabled: boolean;
};

type RemindersResponse = {
  reminders: Reminder[];
};

export function RemindersCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Reminder[]>([
    { type: 'vitals', time: '09:00', enabled: true },
    { type: 'meds', time: '20:00', enabled: true },
  ]);

  useEffect(() => {
    let active = true;
    fetch('/api/reminders', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: RemindersResponse) => {
        if (!active) return;
        if (Array.isArray(data.reminders) && data.reminders.length) {
          const merged = form.map((item) => {
            const match = data.reminders.find((reminder) => reminder.type === item.type);
            return match ? { ...item, ...match } : item;
          });
          setForm(merged);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveReminders() {
    setSaving(true);
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminders: form,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  function updateReminder(type: Reminder['type'], changes: Partial<Reminder>) {
    setForm((prev) =>
      prev.map((item) => (item.type === type ? { ...item, ...changes, type } : item))
    );
  }

  return (
    <section className="cmx-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Reminders</h2>
        <span className="text-xs opacity-70">Push notifications</span>
      </div>

      {form.map((reminder) => (
        <div key={reminder.type} className="flex flex-wrap items-center justify-between gap-4 border border-cmx-line rounded-lg p-3">
          <div>
            <div className="text-xs uppercase opacity-70">
              {reminder.type === 'vitals' ? 'Vitals' : 'Medication'}
            </div>
            <div className="text-sm opacity-70">
              {reminder.type === 'vitals' ? 'Time to log BP/weight' : 'Take or log your meds'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="time"
              className="border border-cmx-line rounded px-2 py-1 text-sm"
              value={reminder.time}
              onChange={(e) => updateReminder(reminder.type, { time: e.target.value })}
            />
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={(e) => updateReminder(reminder.type, { enabled: e.target.checked })}
              />
              Enabled
            </label>
          </div>
        </div>
      ))}

      <button className="cmx-btn" onClick={saveReminders} disabled={saving || loading}>
        {saving ? 'Saving...' : 'Save Reminders'}
      </button>
    </section>
  );
}
