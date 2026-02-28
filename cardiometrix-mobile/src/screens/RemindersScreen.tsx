import type React from 'react';
import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { fetchReminders, saveReminders } from '../api/reminders';
import { Reminder } from '../api/types';
import { scheduleReminders } from '../utils/reminders';
import { theme } from '../theme';

const DEFAULTS: Reminder[] = [
  { id: 'local-vitals', type: 'vitals', time: '09:00', enabled: true },
  { id: 'local-meds', type: 'meds', time: '20:00', enabled: true },
];

export function RemindersScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULTS);

  useEffect(() => {
    let active = true;
    fetchReminders()
      .then((data) => {
        if (!active) return;
        if (data.length) {
          const merged = DEFAULTS.map((item) => data.find((r) => r.type === item.type) ?? item);
          setReminders(merged);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const saved = await saveReminders(reminders);
      await scheduleReminders(saved.length ? saved : reminders);
    } finally {
      setSaving(false);
    }
  }

  function updateReminder(type: Reminder['type'], changes: Partial<Reminder>) {
    setReminders((prev) => prev.map((item) => (item.type === type ? { ...item, ...changes } : item)));
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.subtitle}>Set daily notifications for vitals and meds.</Text>

        {reminders.map((reminder) => (
          <View key={reminder.type} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{reminder.type === 'vitals' ? 'Vitals' : 'Medication'}</Text>
              <Switch
                value={reminder.enabled}
                onValueChange={(value) => updateReminder(reminder.type, { enabled: value })}
                thumbColor={theme.colors.primary}
                trackColor={{ true: theme.colors.primarySoft, false: theme.colors.border }}
              />
            </View>
            <Text style={styles.helper}>
              {reminder.type === 'vitals' ? 'Daily check-in to log BP/weight.' : 'Daily medication reminder.'}
            </Text>
            <TextInput
              value={reminder.time}
              onChangeText={(value) => updateReminder(reminder.type, { time: value })}
              placeholder="HH:MM"
              style={styles.input}
              editable={!loading}
            />
          </View>
        ))}

        <View style={styles.primaryButton}>
          <Button title={saving ? 'Saving...' : loading ? 'Loading...' : 'Save Reminders'} onPress={onSave} disabled={saving || loading} color="#ffffff" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing.screen,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.card,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    marginTop: 8,
  },
});
