import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { getWeeklyRiskSummary } from '../api/risk';
import { WeeklyRiskSummary } from '../api/types';
import { theme } from '../theme';

export function TrendsScreen() {
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
      setError(err instanceof Error ? err.message : 'Failed to load trends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Trend Insights</Text>
      <Text style={styles.subtitle}>Rolling averages and slope-based signals</Text>

      <SectionCard>
        <Text style={styles.label}>Weekly Summary</Text>
        {loading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.value}>{summary?.summaryText ?? 'No summary yet.'}</Text>
        )}
        <Text style={styles.meta}>
          Trend: {summary?.signals?.trend ?? '—'} · Deterioration:{' '}
          {summary?.signals?.deteriorationDetected ? 'Yes' : 'No'}
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.label}>Explanations</Text>
        {summary?.explanations?.length ? (
          summary.explanations.map((line, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.value}>{line}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.value}>No explanations yet.</Text>
        )}
      </SectionCard>

      <SectionCard>
        <Text style={styles.label}>Metrics</Text>
        {summary?.metrics ? (
          <>
            <Metric label="Risk Avg (7d)" value={summary.metrics.risk_score_avg_7d} suffix="" />
            <Metric label="Risk Slope (14d)" value={summary.metrics.risk_score_slope_14d} suffix="" />
            <Metric label="BP Sys Avg (7d)" value={summary.metrics.bp_sys_avg_7d} suffix="mmHg" />
            <Metric label="BP Sys Slope (14d)" value={summary.metrics.bp_sys_slope_14d} suffix="mmHg/d" />
            <Metric label="BP Dia Avg (7d)" value={summary.metrics.bp_dia_avg_7d} suffix="mmHg" />
            <Metric label="BP Dia Slope (14d)" value={summary.metrics.bp_dia_slope_14d} suffix="mmHg/d" />
            <Metric label="Weight Avg (7d)" value={summary.metrics.weight_avg_7d} suffix="kg" />
            <Metric label="Weight Slope (14d)" value={summary.metrics.weight_slope_14d} suffix="kg/d" />
          </>
        ) : (
          <Text style={styles.value}>No metric data yet.</Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

function Metric({ label, value, suffix }: { label: string; value?: number | null; suffix: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value === null || value === undefined ? '—' : value.toFixed(2)} {suffix}
      </Text>
    </View>
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
    flexShrink: 1,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    marginRight: 6,
    color: theme.colors.text,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  error: {
    color: theme.colors.danger,
  },
});
