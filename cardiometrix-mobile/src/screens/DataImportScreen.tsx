import type React from 'react';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { importVitals } from '../api/vitals';
import { importAppleHealthVitals } from '../utils/health/appleHealth';
import { importGoogleFitVitals } from '../utils/health/googleFit';
import { theme } from '../theme';

export function DataImportScreen() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState<'apple' | 'google' | ''>('');

  async function handleAppleImport() {
    setLoading('apple');
    setStatus('');
    try {
      const entries = await importAppleHealthVitals(30);
      if (!entries.length) {
        setStatus('No Apple Health data found in the last 30 days.');
        return;
      }
      await importVitals(entries);
      setStatus(`Imported ${entries.length} Apple Health entries.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Apple Health import failed.');
    } finally {
      setLoading('');
    }
  }

  async function handleGoogleImport() {
    setLoading('google');
    setStatus('');
    try {
      const entries = await importGoogleFitVitals(30);
      if (!entries.length) {
        setStatus('No Google Fit data found in the last 30 days.');
        return;
      }
      await importVitals(entries);
      setStatus(`Imported ${entries.length} Google Fit entries.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Google Fit import failed.');
    } finally {
      setLoading('');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Data Import</Text>
        <Text style={styles.subtitle}>Sync vitals from Apple Health or Google Fit.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Apple Health</Text>
          <Text style={styles.helper}>Imports weight and blood pressure from the last 30 days.</Text>
          <View style={styles.buttonRow}>
            <Button
              title={loading === 'apple' ? 'Importing...' : 'Import from Apple Health'}
              onPress={handleAppleImport}
              disabled={loading !== ''}
              color={theme.colors.primaryDark}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Google Fit</Text>
          <Text style={styles.helper}>Imports weight and blood pressure from the last 30 days.</Text>
          <View style={styles.buttonRow}>
            <Button
              title={loading === 'google' ? 'Importing...' : 'Import from Google Fit'}
              onPress={handleGoogleImport}
              disabled={loading !== ''}
              color={theme.colors.primaryDark}
            />
          </View>
        </View>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        <Text style={styles.note}>
          Requires a custom dev build with native health integrations enabled.
        </Text>
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
  buttonRow: {
    marginTop: 12,
  },
  status: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
});
