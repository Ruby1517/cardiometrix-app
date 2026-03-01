import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { fetchTodayNudge, markTodayNudgeDone } from '../api/nudges';
import { fetchTodayRisk, getWeeklyRiskSummary } from '../api/risk';
import { RiskToday, WeeklyRiskSummary } from '../api/types';
import { createShareLink } from '../api/clinician';
import { theme } from '../theme';

type RiskLevel = 'Low' | 'Moderate' | 'Needs Attention' | 'Unknown';

export function HealthOverviewScreen() {
  const navigation = useNavigation();
  const [risk, setRisk] = useState<RiskToday | null>(null);
  const [nudge, setNudge] = useState<{ message: string; status?: string } | null>(null);
  const [weekly, setWeekly] = useState<WeeklyRiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [doneLoading, setDoneLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRisk, todayNudge, weeklySummary] = await Promise.all([
        fetchTodayRisk().catch(() => null),
        fetchTodayNudge().catch(() => null),
        getWeeklyRiskSummary().catch(() => null),
      ]);
      setRisk(todayRisk);
      setNudge(todayNudge ? { message: todayNudge.message, status: todayNudge.status } : null);
      setWeekly(weeklySummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const riskLevel: RiskLevel =
    risk?.band === 'green'
      ? 'Low'
      : risk?.band === 'amber'
        ? 'Moderate'
        : risk?.band === 'red'
          ? 'Needs Attention'
          : 'Unknown';

  const topDrivers = useMemo(() => (risk?.explainability?.drivers || []).slice(0, 3), [risk]);
  const changes = useMemo(() => (risk?.explainability?.changes || []).slice(0, 3), [risk]);

  async function onDoneNudge() {
    setDoneLoading(true);
    try {
      await markTodayNudgeDone();
      await load();
    } finally {
      setDoneLoading(false);
    }
  }

  async function onShareWeeklyReport() {
    try {
      const report = await createShareLink();
      await Share.share({
        message: `CardioMetrix weekly report (expires ${new Date(report.expiresAt).toLocaleDateString()}): ${report.url}`,
        url: report.url,
      });
    } catch (error) {
      Alert.alert('Unable to share', error instanceof Error ? error.message : 'Try again later.');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Daily risk, why it changed, and one action for today.</Text>

        <SectionCard>
          <Text style={styles.sectionTitle}>Today risk</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Overall</Text>
            <Text style={styles.value}>{riskLevel}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Score</Text>
            <Text style={styles.value}>{typeof risk?.risk === 'number' ? risk.risk.toFixed(2) : '—'}</Text>
          </View>
          <Text style={styles.detail}>{riskSummaryText(riskLevel)}</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Explainability</Text>
          {topDrivers.length ? (
            <>
              <Text style={styles.smallLabel}>Drivers</Text>
              <View style={styles.driverRow}>
                {topDrivers.map((driver) => (
                  <View key={`${driver.name}-${driver.contribution}`} style={styles.driverChip}>
                    <Text style={styles.driverText}>{driver.name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.detail}>No strong drivers available yet.</Text>
          )}

          {changes.length ? (
            <>
              <Text style={[styles.smallLabel, styles.blockTop]}>What changed vs baseline</Text>
              {changes.map((item) => (
                <Text key={item} style={styles.detail}>- {item}</Text>
              ))}
            </>
          ) : null}
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Today nudge</Text>
          <Text style={styles.detail}>{nudge?.message || 'No nudge yet for today.'}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={onDoneNudge} disabled={doneLoading}>
              <Text style={styles.actionButtonText}>{doneLoading ? 'Updating...' : 'Mark Done'}</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Weekly report</Text>
          <Text style={styles.detail}>{weekly?.summaryText || 'Weekly report will populate as data arrives.'}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={onShareWeeklyReport}>
              <Text style={styles.actionButtonText}>Export / Share Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => (navigation as any).navigate('AddData', { screen: 'DataImport' })}
            >
              <Text style={styles.secondaryButtonText}>Device Import</Text>
            </TouchableOpacity>
          </View>
        </SectionCard>

        {loading ? <Text style={styles.loading}>Updating...</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function riskSummaryText(level: RiskLevel) {
  if (level === 'Low') return 'Risk is stable today. Keep your routine.';
  if (level === 'Moderate') return 'Risk is elevated vs baseline. Follow today\'s nudge.';
  if (level === 'Needs Attention') return 'Risk is high today. Keep interventions low-burden and consistent.';
  return 'Risk unavailable yet. Add more vitals to improve scoring.';
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
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  smallLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  blockTop: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detail: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  driverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverChip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  driverText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  loading: {
    marginTop: 12,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
