import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { getWeeklyRiskSummary } from '../api/risk';
import { WeeklyRiskSummary } from '../api/types';
import { theme } from '../theme';

export function WeeklySummaryScreen() {
  const [summary, setSummary] = useState<WeeklyRiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWeeklyRiskSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly Summary</Text>
      <Text style={styles.subtitle}>Full explanation and context</Text>

      <SectionCard>
        <Text style={styles.label}>Overview</Text>
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <Text style={styles.value}>{summary?.summaryText ?? 'No summary yet.'}</Text>
            <Text style={styles.meta}>
              {summary?.weekStart ?? '—'} — {summary?.weekEnd ?? '—'}
            </Text>
          </>
        )}
      </SectionCard>

      <SectionCard>
        <Text style={styles.label}>Key Drivers</Text>
        {summary?.explanations?.length ? (
          summary.explanations.map((line, index) => (
            <Text key={index} style={styles.value}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.value}>No explanations yet.</Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  value: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  error: {
    color: theme.colors.danger,
  },
});
