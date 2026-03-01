import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Button, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { fetchDataCoverage, type DataCoverageResponse } from '../api/coverage';
import { syncHealthData, type SyncOutcome } from '../utils/health/syncHealthData';
import { theme } from '../theme';

type LinkStatus = 'idle' | 'syncing' | 'linked' | 'error';

export function DataImportScreen() {
  const [status, setStatus] = useState('');
  const [lastSync, setLastSync] = useState<SyncOutcome | null>(null);
  const [coverage, setCoverage] = useState<DataCoverageResponse | null>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('idle');

  const providerLabel = useMemo(() => {
    if (Platform.OS === 'ios') return 'Apple Health';
    if (Platform.OS === 'android') return 'Google Fit / Health Connect';
    return 'Device Health Source';
  }, []);

  const loadCoverage = useCallback(async () => {
    setLoadingCoverage(true);
    try {
      const data = await fetchDataCoverage();
      setCoverage(data);
      const source = Platform.OS === 'ios' ? data.sources.apple_health : data.sources.google_fit;
      setLinkStatus(source.linked ? 'linked' : 'idle');
    } catch {
      setCoverage(null);
    } finally {
      setLoadingCoverage(false);
    }
  }, []);

  useEffect(() => {
    loadCoverage().catch(() => undefined);
  }, [loadCoverage]);

  async function handleSync() {
    setLinkStatus('syncing');
    setStatus('');
    const outcome = await syncHealthData(30);
    setLastSync(outcome);
    if (outcome.status === 'success') {
      setLinkStatus('linked');
      setStatus(outcome.message);
      await loadCoverage();
      return;
    }
    if (outcome.status === 'not_supported') {
      setLinkStatus('idle');
      setStatus(outcome.message);
      return;
    }
    setLinkStatus('error');
    setStatus(outcome.message);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Device Linking</Text>
        <Text style={styles.subtitle}>Connect your health source and sync recent vitals automatically.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{providerLabel}</Text>
          <Text style={styles.helper}>Imports BP, weight, steps, sleep, and heart metrics where available.</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusValue, linkStatus === 'error' ? styles.statusError : null]}>
              {linkStatus === 'idle' ? 'Not linked' : linkStatus === 'syncing' ? 'Syncing...' : linkStatus === 'linked' ? 'Linked' : 'Needs attention'}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            {linkStatus === 'syncing' ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={theme.colors.primaryDark} />
                <Text style={styles.helper}>Syncing last 30 days...</Text>
              </View>
            ) : (
              <Button
                title={linkStatus === 'error' ? 'Retry Link & Sync' : 'Link & Sync'}
                onPress={handleSync}
                color={theme.colors.primaryDark}
              />
            )}
          </View>

          {status ? <Text style={styles.statusText}>{status}</Text> : null}
          {lastSync ? (
            <Text style={styles.meta}>Last run: {lastSync.importedCount} records ({lastSync.status}).</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Data coverage (last 7 days)</Text>
          {loadingCoverage ? (
            <Text style={styles.helper}>Loading coverage...</Text>
          ) : coverage ? (
            <View style={styles.coverageGrid}>
              <CoverageStat label="Sleep days" value={`${coverage.metrics.sleepDaysWithData}/7`} />
              <CoverageStat label="Steps days" value={`${coverage.metrics.stepsDaysWithData}/7`} />
              <CoverageStat label="BP readings" value={`${coverage.metrics.bpReadingsThisWeek}`} />
              <CoverageStat label="Weight entries" value={`${coverage.metrics.weightReadingsThisWeek}`} />
            </View>
          ) : (
            <Text style={styles.helper}>Coverage unavailable.</Text>
          )}
        </View>

        <Text style={styles.note}>Requires a custom dev build with native health integrations enabled.</Text>
      </ScrollView>
    </Screen>
  );
}

function CoverageStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  statusValue: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
  },
  statusError: {
    color: theme.colors.danger,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 8,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  note: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  inlineLoading: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  coverageGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 10,
    backgroundColor: theme.colors.surfaceAlt,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
