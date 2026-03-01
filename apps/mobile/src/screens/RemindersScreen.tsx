import type React from 'react';
import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { fetchNotificationSettings, updateNotificationSettings } from '../api/notifications';
import { theme } from '../theme';

const DEFAULT_TIME = '09:00';

export function RemindersScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyTimeLocal, setNotifyTimeLocal] = useState(DEFAULT_TIME);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles');

  useEffect(() => {
    let active = true;
    fetchNotificationSettings()
      .then((settings) => {
        if (!active) return;
        setNotifyEnabled(settings.notifyEnabled);
        setNotifyTimeLocal(settings.notifyTimeLocal || DEFAULT_TIME);
        setTimezone(settings.timezone || timezone);
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
      await updateNotificationSettings({
        notifyEnabled,
        notifyTimeLocal,
        timezone,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Set your preferred local time. Backend sends push automatically, even when the app is closed.</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Daily AI copilot notification</Text>
            <Switch
              value={notifyEnabled}
              onValueChange={setNotifyEnabled}
              thumbColor={theme.colors.primary}
              trackColor={{ true: theme.colors.primarySoft, false: theme.colors.border }}
            />
          </View>

          <Text style={styles.helper}>Preferred local time (HH:MM)</Text>
          <TextInput
            value={notifyTimeLocal}
            onChangeText={setNotifyTimeLocal}
            placeholder="09:00"
            style={styles.input}
            editable={!loading}
            autoCapitalize="none"
          />

          <Text style={styles.helper}>Timezone</Text>
          <TextInput value={timezone} onChangeText={setTimezone} style={styles.input} editable={!loading} autoCapitalize="none" />
        </View>

        <View style={styles.primaryButton}>
          <Button title={saving ? 'Saving...' : loading ? 'Loading...' : 'Save'} onPress={onSave} disabled={saving || loading} color="#ffffff" />
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
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8,
  },
  helper: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    marginTop: 8,
  },
});
