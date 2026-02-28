import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { EducationCard } from '../components/EducationCard';
import { fetchVitals } from '../api/vitals';
import { fetchLabs } from '../api/labs';
import { fetchGoals } from '../api/goals';
import { fetchAnomalies, Anomaly } from '../api/anomalies';
import { fetchDataQuality, DataQuality } from '../api/quality';
import { fetchCohortComparison, CohortComparison } from '../api/cohort';
import { Goal, LabEntry, VitalEntry } from '../api/types';
import { getQueueSummary, syncPendingQueue } from '../store/offlineQueue';
import { theme } from '../theme';
import { selectEducationRules } from '../utils/educationRules';

export function VitalsListScreen() {
  const [entries, setEntries] = useState<VitalEntry[]>([]);
  const [labs, setLabs] = useState<LabEntry[]>([]);
  const [goal, setGoal] = useState<GoalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'labs'>('vitals');
  const [showGoals, setShowGoals] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [quality, setQuality] = useState<DataQuality | null>(null);
  const [cohort, setCohort] = useState<CohortComparison | null>(null);
  const navigation = useNavigation();
  const [pending, setPending] = useState({ pending: 0, failed: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchVitals(),
        fetchLabs(),
        getQueueSummary('vitals'),
        fetchGoals(),
        fetchAnomalies(),
        fetchDataQuality(),
        fetchCohortComparison(),
      ]);
      const vitalsRes = results[0];
      const labsRes = results[1];
      const queueRes = results[2];
      const goalsRes = results[3];
      const anomaliesRes = results[4];
      const qualityRes = results[5];
      const cohortRes = results[6];
      if (vitalsRes.status === 'fulfilled') {
        setEntries(vitalsRes.value);
        setGoal((prev) => ({
          ...(prev ?? {}),
          vitals: computeVitalsSummary(vitalsRes.value),
        }));
      }
      if (labsRes.status === 'fulfilled') {
        setLabs(labsRes.value);
      }
      if (queueRes.status === 'fulfilled') {
        setPending(queueRes.value);
      }
      if (goalsRes.status === 'fulfilled') {
        setGoal((prev) => ({
          ...(prev ?? {}),
          targets: goalsRes.value,
        }));
      }
      if (anomaliesRes.status === 'fulfilled') {
        setAnomalies(anomaliesRes.value);
      }
      if (qualityRes.status === 'fulfilled') {
        setQuality(qualityRes.value);
      }
      if (cohortRes.status === 'fulfilled') {
        setCohort(cohortRes.value);
      }
    } catch {
      setEntries([]);
      setLabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summary = useMemo(() => {
    const latestBp = entries.find((entry) => entry.systolic && entry.diastolic) ?? null;
    const latestWeight = entries.find((entry) => typeof entry.weight === 'number') ?? null;
    const latestA1c = labs.find((entry) => entry.type === 'a1c') ?? null;
    const latestLdl = labs.find((entry) => entry.type === 'lipid') ?? null;
    return { latestBp, latestWeight, latestA1c, latestLdl };
  }, [entries, labs]);

  const educationRules = useMemo(() => {
    return selectEducationRules({ hasA1c: Boolean(summary.latestA1c?.a1cPercent) });
  }, [summary.latestA1c]);

  return (
    <Screen>
      <FlatList
        data={activeTab === 'vitals' ? entries : labs}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Vitals</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddVitals' as never)}>
                <Text style={styles.primaryButtonText}>Add Measurement</Text>
              </TouchableOpacity>
            </View>

            <SectionCard>
              <Text style={styles.sectionTitle}>Latest</Text>
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="BP"
                  value={
                    summary.latestBp
                      ? `${summary.latestBp.systolic}/${summary.latestBp.diastolic}`
                      : '—'
                  }
                  suffix="mmHg"
                />
                <SummaryItem
                  label="Weight"
                  value={summary.latestWeight?.weight?.toFixed(1) ?? '—'}
                  suffix="kg"
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="HbA1c"
                  value={summary.latestA1c?.a1cPercent?.toFixed(1) ?? '—'}
                  suffix="%"
                />
                <SummaryItem
                  label="LDL"
                  value={summary.latestLdl?.ldl ?? '—'}
                  suffix="mg/dL"
                />
              </View>
              {educationRules.map((rule) => (
                <EducationCard key={rule.id} rule={rule} />
              ))}
            </SectionCard>

            <SectionCard>
              <TouchableOpacity
                onPress={() => setShowGoals((prev) => !prev)}
                style={styles.goalHeader}
              >
                <Text style={styles.goalTitle}>Goals</Text>
                <Text style={styles.goalAction}>{showGoals ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              {showGoals ? (
                <>
                  <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>BP target</Text>
                    <Text style={styles.goalValue}>
                      {goal?.targets?.bpSystolicTarget ?? '—'}/{goal?.targets?.bpDiastolicTarget ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>Weight target</Text>
                    <Text style={styles.goalValue}>{goal?.targets?.weightTargetKg ?? '—'} kg</Text>
                  </View>
                  <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>7d BP change</Text>
                    <Text style={styles.goalValue}>{goal?.vitals?.bpDelta ?? '—'}</Text>
                  </View>
                  <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>7d weight change</Text>
                    <Text style={styles.goalValue}>{goal?.vitals?.weightDelta ?? '—'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('Goals' as never)}>
                    <Text style={styles.goalLink}>Edit goals</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.goalHint}>Tap to view targets and weekly change.</Text>
              )}
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Alerts</Text>
              {anomalies.length === 0 ? (
                <Text style={styles.emptySubtitle}>No spikes detected.</Text>
              ) : (
                anomalies.map((anomaly) => (
                  <View key={`${anomaly.type}-${anomaly.date}-${anomaly.title}`} style={styles.alertItem}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertTitle}>{anomaly.title}</Text>
                      <Text style={styles.alertDate}>{anomaly.date}</Text>
                    </View>
                    <Text style={styles.alertDetail}>{anomaly.detail}</Text>
                  </View>
                ))
              )}
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Data Quality</Text>
              {!quality ? (
                <Text style={styles.emptySubtitle}>Not enough data yet.</Text>
              ) : (
                <>
                  <View style={styles.qualityRow}>
                    <Text style={styles.qualityScore}>{quality.score}</Text>
                    <Text style={styles.qualitySummary}>{quality.summary}</Text>
                  </View>
                  <View style={styles.qualityBreakdown}>
                    <Text style={styles.qualityItem}>
                      Vitals {quality.days.vitals}/{quality.windowDays}
                    </Text>
                    <Text style={styles.qualityItem}>
                      Symptoms {quality.days.symptoms}/{quality.windowDays}
                    </Text>
                    <Text style={styles.qualityItem}>
                      Meds {quality.days.meds}/{quality.windowDays}
                    </Text>
                  </View>
                </>
              )}
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Cohort Comparison</Text>
              {!cohort ? (
                <Text style={styles.emptySubtitle}>Complete your profile to see benchmarks.</Text>
              ) : (
                <>
                  <Text style={styles.alertDetail}>{cohort.summary}</Text>
                  <View style={styles.qualityBreakdown}>
                    <Text style={styles.qualityItem}>Cohort {cohort.cohortLabel}</Text>
                    <Text style={styles.qualityItem}>
                      BP {cohort.benchmarks.systolic}/{cohort.benchmarks.diastolic}
                    </Text>
                    <Text style={styles.qualityItem}>
                      BMI {cohort.benchmarks.bmiMin}-{cohort.benchmarks.bmiMax}
                    </Text>
                    <Text style={styles.qualityItem}>Your BMI {cohort.user.bmi ?? '—'}</Text>
                  </View>
                  <Text style={styles.cohortNote}>{cohort.note}</Text>
                </>
              )}
            </SectionCard>

            <View style={styles.tabs}>
              <TouchableOpacity
                onPress={() => setActiveTab('vitals')}
                style={[styles.tabButton, activeTab === 'vitals' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'vitals' && styles.tabTextActive]}>Vitals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('labs')}
                style={[styles.tabButton, activeTab === 'labs' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === 'labs' && styles.tabTextActive]}>Labs</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'vitals' && (pending.pending || pending.failed) ? (
              <View style={styles.pending}>
                <Text style={styles.pendingText}>Pending Sync ({pending.pending + pending.failed})</Text>
                {pending.failed ? (
                  <Text
                    style={styles.retry}
                    onPress={async () => {
                      await syncPendingQueue();
                      const summary = await getQueueSummary('vitals');
                      setPending(summary);
                    }}
                  >
                    Retry
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title={activeTab === 'vitals' ? 'No vitals yet' : 'No labs yet'}
            description={
              activeTab === 'vitals'
                ? 'Add a BP or weight entry to start seeing trends.'
                : 'Add HbA1c or lipid panels to track lab changes.'
            }
            actionLabel={activeTab === 'vitals' ? 'Add vitals' : 'Add labs'}
            onAction={() =>
              navigation.navigate(
                (activeTab === 'vitals' ? 'AddVitals' : 'AddLabs') as never
              )
            }
          />
        }
        renderItem={({ item }) => {
          if (activeTab === 'vitals') {
            const entry = item as VitalEntry;
            return (
              <SectionCard>
                <View style={styles.row}>
                  <Text style={styles.type}>{entry.systolic || entry.diastolic ? 'Blood Pressure' : 'Weight'}</Text>
                  <Text style={styles.date}>{formatDate(entry.measuredAt)}</Text>
                </View>
                {entry.systolic || entry.diastolic ? (
                  <>
                    <View style={styles.bpRow}>
                      <View>
                        <Text style={styles.value}>
                          {entry.systolic}/{entry.diastolic} mmHg
                        </Text>
                        <Text style={styles.bpMeta}>Pulse {entry.pulse ?? '—'}</Text>
                      </View>
                      <View style={styles.bpBadges}>
                        <BadgeView badge={bpSysBadge(entry.systolic)} />
                        <BadgeView badge={bpDiaBadge(entry.diastolic)} />
                      </View>
                    </View>
                  </>
                ) : (
                  <Text style={styles.value}>{entry.weight?.toFixed(1)} kg</Text>
                )}
              </SectionCard>
            );
          }
          const lab = item as LabEntry;
          const previous = findPreviousLab(labs, lab);
          const a1cTrend = lab.type === 'a1c' ? trendLabel(lab.a1cPercent, previous?.a1cPercent, '%') : null;
          const ldlTrend =
            lab.type === 'lipid' ? trendLabel(lab.ldl ?? lab.total, previous?.ldl ?? previous?.total, 'mg/dL') : null;
          return (
            <SectionCard>
              <View style={styles.row}>
                <Text style={styles.type}>{lab.type === 'a1c' ? 'HbA1c' : 'Lipid Panel'}</Text>
                <Text style={styles.date}>{formatDate(lab.measuredAt)}</Text>
              </View>
              {lab.type === 'a1c' ? (
                <>
                  <View style={styles.labRow}>
                    <Text style={styles.value}>{formatNumber(lab.a1cPercent)}%</Text>
                    <BadgeView badge={a1cBadge(lab.a1cPercent)} />
                  </View>
                  {a1cTrend ? <Text style={styles.trendText}>Trend: {a1cTrend}</Text> : null}
                </>
              ) : (
                <>
                  <View style={styles.labRow}>
                    <Text style={styles.value}>Total {formatNumber(lab.total)}</Text>
                    <BadgeView badge={totalBadge(lab.total)} />
                  </View>
                  <View style={styles.labRow}>
                    <Text style={styles.value}>LDL {formatNumber(lab.ldl)}</Text>
                    <BadgeView badge={ldlBadge(lab.ldl)} />
                  </View>
                  <View style={styles.labRow}>
                    <Text style={styles.value}>HDL {formatNumber(lab.hdl)}</Text>
                    <BadgeView badge={hdlBadge(lab.hdl)} />
                  </View>
                  <View style={styles.labRow}>
                    <Text style={styles.value}>TG {formatNumber(lab.triglycerides)}</Text>
                    <BadgeView badge={tgBadge(lab.triglycerides)} />
                  </View>
                  {ldlTrend ? <Text style={styles.trendText}>LDL trend: {ldlTrend}</Text> : null}
                </>
              )}
            </SectionCard>
          );
        }}
      />
    </Screen>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNumber(value?: number) {
  if (value === null || value === undefined) return '—';
  if (Number.isNaN(value)) return '—';
  return value.toString();
}

function SummaryItem({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>
        {value} {value === '—' ? '' : suffix}
      </Text>
    </View>
  );
}

type GoalSummary = {
  targets?: Goal | null;
  vitals?: {
    bpDelta: string;
    weightDelta: string;
  };
};

function computeVitalsSummary(entries: VitalEntry[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const bpEntries = entries.filter((entry) => entry.systolic && entry.diastolic);
  const weightEntries = entries.filter((entry) => typeof entry.weight === 'number');

  const bpWeek = bpEntries.filter((entry) => new Date(entry.measuredAt).getTime() >= weekAgo);
  const weightWeek = weightEntries.filter((entry) => new Date(entry.measuredAt).getTime() >= weekAgo);

  return {
    bpDelta: formatBpDelta(bpWeek),
    weightDelta: formatWeightDelta(weightWeek),
  };
}

function formatBpDelta(entries: VitalEntry[]) {
  if (entries.length < 2) return '—';
  const oldest = entries[entries.length - 1];
  const latest = entries[0];
  const sysDelta = (latest.systolic ?? 0) - (oldest.systolic ?? 0);
  const diaDelta = (latest.diastolic ?? 0) - (oldest.diastolic ?? 0);
  return `${formatSigned(sysDelta)} / ${formatSigned(diaDelta)} mmHg`;
}

function formatWeightDelta(entries: VitalEntry[]) {
  if (entries.length < 2) return '—';
  const oldest = entries[entries.length - 1];
  const latest = entries[0];
  if (typeof oldest.weight !== 'number' || typeof latest.weight !== 'number') return '—';
  const delta = latest.weight - oldest.weight;
  return `${formatSigned(delta)} kg`;
}

function formatSigned(value: number) {
  const fixed = Math.abs(value).toFixed(1);
  if (value > 0) return `+${fixed}`;
  if (value < 0) return `-${fixed}`;
  return `0.0`;
}

function BadgeView({ badge }: { badge: Badge }) {
  const toneStyle =
    badge.tone === 'green'
      ? styles.badgeGreen
      : badge.tone === 'amber'
        ? styles.badgeAmber
        : badge.tone === 'red'
          ? styles.badgeRed
          : styles.badgeMuted;
  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{badge.label}</Text>
    </View>
  );
}

type Badge = {
  label: string;
  tone: 'green' | 'amber' | 'red' | 'muted';
};

function a1cBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: '—', tone: 'muted' };
  if (value < 5.7) return { label: 'At goal', tone: 'green' };
  if (value < 6.5) return { label: 'Elevated', tone: 'amber' };
  return { label: 'High', tone: 'red' };
}

function bpSysBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: 'SYS —', tone: 'muted' };
  if (value < 120) return { label: 'SYS OK', tone: 'green' };
  if (value < 130) return { label: 'SYS Elevated', tone: 'amber' };
  if (value < 140) return { label: 'SYS High', tone: 'red' };
  return { label: 'SYS High', tone: 'red' };
}

function bpDiaBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: 'DIA —', tone: 'muted' };
  if (value < 80) return { label: 'DIA OK', tone: 'green' };
  if (value < 90) return { label: 'DIA High', tone: 'amber' };
  return { label: 'DIA High', tone: 'red' };
}

function totalBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: '—', tone: 'muted' };
  if (value < 200) return { label: 'At goal', tone: 'green' };
  if (value < 240) return { label: 'Borderline', tone: 'amber' };
  return { label: 'High', tone: 'red' };
}

function ldlBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: '—', tone: 'muted' };
  if (value < 100) return { label: 'At goal', tone: 'green' };
  if (value < 130) return { label: 'Borderline', tone: 'amber' };
  if (value < 160) return { label: 'High', tone: 'red' };
  return { label: 'Very high', tone: 'red' };
}

function hdlBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: '—', tone: 'muted' };
  if (value >= 60) return { label: 'At goal', tone: 'green' };
  if (value >= 40) return { label: 'OK', tone: 'amber' };
  return { label: 'Low', tone: 'red' };
}

function tgBadge(value?: number): Badge {
  if (typeof value !== 'number') return { label: '—', tone: 'muted' };
  if (value < 150) return { label: 'At goal', tone: 'green' };
  if (value < 200) return { label: 'Borderline', tone: 'amber' };
  return { label: 'High', tone: 'red' };
}

function trendLabel(current?: number, previous?: number, unit?: string) {
  if (typeof current !== 'number' || typeof previous !== 'number') return null;
  const delta = current - previous;
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const value = Math.abs(delta).toFixed(1);
  return `${arrow} ${value}${unit ? ` ${unit}` : ''}`;
}

function findPreviousLab(labs: LabEntry[], current: LabEntry) {
  const index = labs.findIndex((entry) => entry.id === current.id);
  if (index === -1) return null;
  for (let i = index + 1; i < labs.length; i += 1) {
    if (labs[i].type === current.type) return labs[i];
  }
  return null;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.screen,
  },
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  alertItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 10,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  alertDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  alertDetail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qualityScore: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  qualitySummary: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
  qualityBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  qualityItem: {
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cohortNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 16,
    color: theme.colors.text,
  },
  bpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bpBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  bpMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  labRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trendText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  badgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  badgeGreen: {
    backgroundColor: theme.colors.success,
  },
  badgeAmber: {
    backgroundColor: theme.colors.warning,
  },
  badgeRed: {
    backgroundColor: theme.colors.danger,
  },
  badgeMuted: {
    backgroundColor: theme.colors.textMuted,
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  goalAction: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  goalLink: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  goalHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  goalValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    marginTop: 4,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerAction: {
    fontSize: 14,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  pending: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
  },
  retry: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
});
