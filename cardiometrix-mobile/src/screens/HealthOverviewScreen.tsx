import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { fetchTrends } from '../api/insights';
import { fetchRiskForecast } from '../api/forecast';
import { fetchTodayNudge } from '../api/nudges';
import { getWeeklyRiskSummary } from '../api/risk';
import { fetchSummary } from '../api/summary';
import { SummaryResponse, SymptomEntry, TrendMeasurement, WeeklyRiskSummary } from '../api/types';
import { theme } from '../theme';
import { fetchSymptoms } from '../api/symptoms';
import { classifyMomentum, computeSlope } from '../utils/momentum';

type RiskLevel = 'Low' | 'Moderate' | 'Needs Attention' | 'Unknown';

export function HealthOverviewScreen() {
  const navigation = useNavigation();
  const [bpData, setBpData] = useState<TrendMeasurement[]>([]);
  const [weightData, setWeightData] = useState<TrendMeasurement[]>([]);
  const [nudge, setNudge] = useState<string>('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Unknown');
  const [riskSummary, setRiskSummary] = useState('Add more readings to update your overview.');
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [trends, forecast, weekly, todayNudge, summaryData, symptomData] = await Promise.all([
        fetchTrends(),
        fetchRiskForecast(),
        getWeeklyRiskSummary().catch(() => null),
        fetchTodayNudge().catch(() => null),
        fetchSummary('week').catch((err) => {
          setSummaryError(err instanceof Error ? err.message : 'Unable to load summary.');
          return null;
        }),
        fetchSymptoms().catch(() => []),
      ]);
      setBpData(trends.measurements.bp ?? []);
      setWeightData(trends.measurements.weight ?? []);

      const level = forecast?.currentBand === 'green'
        ? 'Low'
        : forecast?.currentBand === 'amber'
          ? 'Moderate'
          : forecast?.currentBand === 'red'
            ? 'Needs Attention'
            : 'Unknown';
      setRiskLevel(level);
      setRiskSummary(buildRiskSummary(level, weekly));
      setNudge(todayNudge?.message ?? 'No nudge yet.');
      setSummary(summaryData);
      if (summaryData) setSummaryError(null);
      setSymptoms(symptomData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pulseAverage = useMemo(() => {
    const pulses = bpData.map((point) => point.pulse).filter((v): v is number => typeof v === 'number');
    if (!pulses.length) return null;
    return pulses.reduce((a, b) => a + b, 0) / pulses.length;
  }, [bpData]);

  const bpSeries = useMemo(() => {
    const sys = bpData
      .map((point) => (typeof point.systolic === 'number' ? point.systolic : null))
      .filter((value): value is number => typeof value === 'number');
    const dia = bpData
      .map((point) => (typeof point.diastolic === 'number' ? point.diastolic : null))
      .filter((value): value is number => typeof value === 'number');
    return { sys, dia };
  }, [bpData]);

  const weightSeries = useMemo(() => {
    return weightData
      .map((point) => (typeof point.kg === 'number' ? point.kg : null))
      .filter((value): value is number => typeof value === 'number');
  }, [weightData]);

  const momentum = useMemo(() => {
    const bpValues = bpData
      .map((point) => (typeof point.systolic === 'number' ? point.systolic : null))
      .filter((value): value is number => typeof value === 'number');
    const bpTimes = bpData.map((point) => new Date(point.date).getTime());

    const weightValues = weightData
      .map((point) => (typeof point.kg === 'number' ? point.kg : null))
      .filter((value): value is number => typeof value === 'number');
    const weightTimes = weightData.map((point) => new Date(point.date).getTime());

    const symptomValues = symptoms
      .map((entry) => entry.severity)
      .filter((value): value is number => typeof value === 'number');
    const symptomTimes = symptoms.map((entry) => new Date(entry.createdAt).getTime());

    const bpSlope = computeSlope(bpValues, bpTimes);
    const weightSlope = computeSlope(weightValues, weightTimes);
    const symptomSlope = computeSlope(symptomValues, symptomTimes);

    return classifyMomentum(bpSlope, weightSlope, symptomSlope);
  }, [bpData, weightData, symptoms]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Health Overview</Text>
        <Text style={styles.subtitle}>A simple snapshot of your current trend.</Text>

        <SectionCard>
          <Text style={styles.sectionTitle}>Health summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Overall risk</Text>
            <Text style={styles.summaryValue}>{riskLevel}</Text>
          </View>
          <Text style={styles.summaryDetail}>{riskSummary}</Text>
          <View style={styles.momentum}>
            <Text style={styles.momentumTitle}>Trend signal: {momentum.momentum}</Text>
            {momentum.reasons.length === 0 ? (
              <Text style={styles.momentumDetail}>Add more readings to build your trend signal.</Text>
            ) : (
              momentum.reasons.map((reason) => (
                <Text key={reason} style={styles.momentumDetail}>
                  - {reason}
                </Text>
              ))
            )}
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This week</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SummaryDetails' as never, { period: 'week' } as never)}>
              <Text style={styles.link}>View details</Text>
            </TouchableOpacity>
          </View>
          {summaryError ? (
            <Text style={styles.summaryDetail}>Summary unavailable. Try again soon.</Text>
          ) : (
            <Text style={styles.summaryDetail}>
              {summary?.narrative ?? 'Add more readings to generate a weekly summary.'}
            </Text>
          )}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipLabel}>BP avg</Text>
              <Text style={styles.summaryChipValue}>
                {summary?.bp ? `${formatValue(summary.bp.avgSys, 0)}/${formatValue(summary.bp.avgDia, 0)}` : '—'}
              </Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipLabel}>Weight delta</Text>
              <Text style={styles.summaryChipValue}>
                {summary?.weight.delta === null || summary?.weight.delta === undefined
                  ? '—'
                  : `${summary.weight.delta.toFixed(1)} kg`}
              </Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipLabel}>Pulse avg</Text>
              <Text style={styles.summaryChipValue}>
                {summary?.pulse.avg === null || summary?.pulse.avg === undefined
                  ? '—'
                  : `${summary.pulse.avg.toFixed(0)} bpm`}
              </Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipLabel}>Symptoms</Text>
              <Text style={styles.summaryChipValue}>{summary ? summary.symptoms.count : '—'}</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Key trends</Text>
            <TouchableOpacity onPress={() => navigation.navigate('InsightsDetail' as never)}>
              <Text style={styles.link}>Details</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.chartLabel}>Blood pressure (SYS & DIA)</Text>
          <View onLayout={handleLayout(setChartWidth, chartWidth)} style={styles.chart}>
            <MultiLineChart
              width={chartWidth}
              height={160}
              series={[
                { data: bpSeries.sys, color: theme.colors.primaryDark },
                { data: bpSeries.dia, color: theme.colors.warning },
              ]}
            />
          </View>

          <Text style={styles.chartLabel}>Weight trend</Text>
          <View onLayout={handleLayout(setChartWidth, chartWidth)} style={styles.chart}>
            <MultiLineChart
              width={chartWidth}
              height={160}
              series={[{ data: weightSeries, color: theme.colors.primary }]}
            />
          </View>

          <View style={styles.pulseRow}>
            <Text style={styles.pulseLabel}>Pulse average</Text>
            <Text style={styles.pulseValue}>{pulseAverage ? `${pulseAverage.toFixed(0)} bpm` : '—'}</Text>
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Today’s nudge</Text>
          <Text style={styles.summaryDetail}>{nudge}</Text>
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsRow}>
            <QuickAction label="Add vitals" onPress={() => navigation.navigate('Vitals' as never, { screen: 'AddVitals' } as never)} />
            <QuickAction label="Add symptoms" onPress={() => navigation.navigate('Symptoms' as never, { screen: 'SymptomCheckin' } as never)} />
            <QuickAction label="Add meds" onPress={() => navigation.navigate('Meds' as never, { screen: 'MedForm' } as never)} />
          </View>
        </SectionCard>

        {loading ? <Text style={styles.loadingText}>Updating overview…</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function buildRiskSummary(level: RiskLevel, weekly: WeeklyRiskSummary | null) {
  if (level === 'Low') return 'Your overall trend looks steady. Keep logging for ongoing insight.';
  if (level === 'Moderate') return 'Your trend shows some movement. Small routines can help keep things steady.';
  if (level === 'Needs Attention') return 'Your trend is higher than usual. Keep tracking and review your habits.';
  if (weekly?.summaryText) return weekly.summaryText;
  return 'Add more readings to update your overview.';
}

function handleLayout(setter: (width: number) => void, current: number) {
  return (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width && width !== current) setter(width);
  };
}

function MultiLineChart({
  width,
  height,
  series,
}: {
  width: number;
  height: number;
  series: { data: number[]; color: string }[];
}) {
  if (!width || !series.some((s) => s.data.length >= 2)) {
    return (
      <View style={[styles.chartPlaceholder, { height }]}>
        <Text style={styles.chartPlaceholderText}>Not enough data</Text>
      </View>
    );
  }

  const padding = 10;
  const flatValues = series.flatMap((s) => s.data);
  const min = Math.min(...flatValues);
  const max = Math.max(...flatValues);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return (
    <Svg width={width} height={height}>
      {series.map((line, index) => {
        if (line.data.length < 2) return null;
        const points = line.data.map((value, i) => {
          const x = padding + (i / (line.data.length - 1)) * usableWidth;
          const y = padding + (1 - (value - min) / range) * usableHeight;
          return `${x},${y}`;
        });
        return <Polyline key={index} points={points.join(' ')} fill="none" stroke={line.color} strokeWidth={2} />;
      })}
    </Svg>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatValue(value: number | null | undefined, digits: number) {
  if (value === null || value === undefined) return '—';
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
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summaryDetail: {
    fontSize: 14,
    color: theme.colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  momentum: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  momentumTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  momentumDetail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  summaryChip: {
    flexGrow: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
  },
  summaryChipLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  summaryChipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 4,
  },
  chart: {
    height: 160,
    marginBottom: 12,
  },
  chartLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  chartPlaceholder: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  pulseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pulseLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  pulseValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
    fontSize: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
