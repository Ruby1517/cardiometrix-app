import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { fetchSummary, SummaryPeriod } from '../api/summary';
import { SummaryResponse } from '../api/types';
import { theme } from '../theme';
import { InsightsStackParamList } from '../utils/navigation';

type SummaryRoute = RouteProp<InsightsStackParamList, 'SummaryDetails'>;

export function SummaryDetailsScreen() {
  const route = useRoute<SummaryRoute>();
  const initialPeriod = route.params?.period ?? 'week';
  const [period, setPeriod] = useState<SummaryPeriod>(initialPeriod);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSummary(period);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load summary.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Summary Details</Text>
        <Text style={styles.subtitle}>A calm snapshot of recent trends.</Text>

        <View style={styles.row}>
          <ToggleButton label="This Week" active={period === 'week'} onPress={() => setPeriod('week')} />
          <ToggleButton label="This Month" active={period === 'month'} onPress={() => setPeriod('month')} />
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
        {error ? (
          <SectionCard>
            <Text style={styles.errorTitle}>We could not load your summary.</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </SectionCard>
        ) : null}

        {!loading && !error && summary ? (
          <>
            <SectionCard>
              <Text style={styles.sectionTitle}>{period === 'week' ? 'This Week' : 'This Month'}</Text>
              <Text style={styles.narrative}>{summary.narrative}</Text>
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Key stats</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>BP average</Text>
                <Text style={styles.statValue}>
                  {formatValue(summary.bp.avgSys, 0)}/{formatValue(summary.bp.avgDia, 0)} mmHg
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>BP trend</Text>
                <Text style={styles.statValue}>{formatTrend(summary.bp.trend)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Weight delta</Text>
                <Text style={styles.statValue}>
                  {summary.weight.delta === null ? '—' : `${summary.weight.delta.toFixed(1)} kg`}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Weight trend</Text>
                <Text style={styles.statValue}>{formatTrend(summary.weight.trend)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Pulse average</Text>
                <Text style={styles.statValue}>
                  {summary.pulse.avg === null ? '—' : `${summary.pulse.avg.toFixed(0)} bpm`}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Symptoms</Text>
                <Text style={styles.statValue}>
                  {summary.symptoms.count} check-ins{summary.symptoms.top ? ` · ${summary.symptoms.top}` : ''}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Meds adherence</Text>
                <Text style={styles.statValue}>
                  {summary.meds.adherenceRate === null ? '—' : `${summary.meds.adherenceRate}%`}
                </Text>
              </View>
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ToggleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatTrend(trend: SummaryResponse['bp']['trend']) {
  if (trend === 'up') return 'Upward';
  if (trend === 'down') return 'Downward';
  if (trend === 'flat') return 'Stable';
  return '—';
}

function formatValue(value: number | null, digits: number) {
  if (value === null) return '—';
  return value.toFixed(digits);
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
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  narrative: {
    fontSize: 14,
    color: theme.colors.text,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  statValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  errorDetail: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.input,
    alignItems: 'center',
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
});
