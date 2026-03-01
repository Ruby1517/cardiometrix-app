import type React from 'react';
import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { fetchGoals, saveGoals } from '../api/goals';
import { theme } from '../theme';

export function GoalsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ systolic: '', diastolic: '', weight: '' });

  useEffect(() => {
    let active = true;
    fetchGoals()
      .then((goal) => {
        if (!active) return;
        if (goal) {
          setForm({
            systolic: goal.bpSystolicTarget?.toString() ?? '',
            diastolic: goal.bpDiastolicTarget?.toString() ?? '',
            weight: goal.weightTargetKg?.toString() ?? '',
          });
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
      await saveGoals({
        bpSystolicTarget: form.systolic ? Number(form.systolic) : undefined,
        bpDiastolicTarget: form.diastolic ? Number(form.diastolic) : undefined,
        weightTargetKg: form.weight ? Number(form.weight) : undefined,
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>Set targets for blood pressure and weight.</Text>

        <Field label="Systolic Target">
          <TextInput
            value={form.systolic}
            onChangeText={(value) => setForm((prev) => ({ ...prev, systolic: value }))}
            keyboardType="numeric"
            placeholder="120"
            style={styles.input}
          />
        </Field>

        <Field label="Diastolic Target">
          <TextInput
            value={form.diastolic}
            onChangeText={(value) => setForm((prev) => ({ ...prev, diastolic: value }))}
            keyboardType="numeric"
            placeholder="80"
            style={styles.input}
          />
        </Field>

        <Field label="Weight Target (kg)">
          <TextInput
            value={form.weight}
            onChangeText={(value) => setForm((prev) => ({ ...prev, weight: value }))}
            keyboardType="numeric"
            placeholder="70"
            style={styles.input}
          />
        </Field>

        <View style={styles.primaryButton}>
          <Button title={saving ? 'Saving...' : loading ? 'Loading...' : 'Save Goals'} onPress={onSave} disabled={saving || loading} color="#ffffff" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
});
