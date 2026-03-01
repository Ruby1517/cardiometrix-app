import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { getWeeklyRiskSummary } from '../api/risk';
import { WeeklyRiskSummary } from '../api/types';
import { getApiBaseUrl } from '../api/http';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../utils/navigation';
import { theme } from '../theme';

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
    <View style={styles.container}>
      <Text style={styles.title}>CardioMetrix</Text>
      <Text style={styles.subtitle}>Weekly risk at a glance</Text>

      <SectionCard>
        <Text style={styles.label}>API Base URL</Text>
        <Text style={styles.value}>{getApiBaseUrl()}</Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.label}>Weekly Summary</Text>
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
        <View style={styles.actions}>
          <Button title="Refresh" onPress={load} />
          <Button title="Details" onPress={() => navigation.navigate('WeeklySummary')} />
        </View>
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.screen,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 6,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  error: {
    color: theme.colors.danger,
    marginTop: 8,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
