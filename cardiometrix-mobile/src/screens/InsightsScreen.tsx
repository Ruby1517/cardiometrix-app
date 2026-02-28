import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Polyline } from 'react-native-svg';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { EducationCard } from '../components/EducationCard';
import { fetchTrends } from '../api/insights';
import { fetchRiskForecast, RiskForecast } from '../api/forecast';
import { fetchCarePlan, CarePlan } from '../api/carePlan';
import { fetchTodayNudge } from '../api/nudges';
import { Nudge, TrendMeasurement } from '../api/types';
import { theme } from '../theme';
import { selectEducationRules } from '../utils/educationRules';

type RangeKey = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function InsightsScreen() {
  const navigation = useNavigation();
  const [range, setRange] = useState<RangeKey>('30d');
  const [loading, setLoading] = useState(true);
  const [bpData, setBpData] = useState<TrendMeasurement[]>([]);
  const [weightData, setWeightData] = useState<TrendMeasurement[]>([]);
  const [error, setError] = useState('');
  const [chartWidth, setChartWidth] = useState(0);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(true);
  const [forecast, setForecast] = useState<RiskForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [carePlanLoading, setCarePlanLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTrends();
      setBpData(data.measurements.bp);
      setWeightData(data.measurements.weight);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    setNudgeLoading(true);
    fetchTodayNudge()
      .then((value) => {
        if (active) setNudge(value);
      })
      .catch(() => {
        if (active) setNudge(null);
      })
      .finally(() => {
        if (active) setNudgeLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setForecastLoading(true);
    fetchRiskForecast()
      .then((data) => {
        if (active) setForecast(data);
      })
      .catch(() => {
        if (active) setForecast(null);
      })
      .finally(() => {
        if (active) setForecastLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCarePlanLoading(true);
    fetchCarePlan()
      .then((data) => {
        if (active) setCarePlan(data);
      })
      .catch(() => {
        if (active) setCarePlan(null);
      })
      .finally(() => {
        if (active) setCarePlanLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { bpRange, weightRange, bpAvg, weightDelta, bpSlope } = useMemo(() => {
    const bp = filterRange(bpData, RANGE_DAYS[range]);
    const wt = filterRange(weightData, RANGE_DAYS[range]);
    return {
      bpRange: bp,
      weightRange: wt,
      bpAvg: averageBp(bp),
      weightDelta: weightChange(wt),
      bpSlope: linearSlope(
        bp
          .map((point, index) => ({ x: index, y: point.systolic ?? null }))
          .filter((point) => typeof point.y === 'number')
          .map((point) => ({ x: point.x, y: point.y as number }))
      ),
    };
  }, [bpData, weightData, range]);

  const bpTrendLabel = slopeLabel(bpSlope);
  const hasTrendData = bpRange.length > 0 || weightRange.length > 0;
  const educationRules = useMemo(() => {
    const trend = bpTrendLabel === 'upward' ? 'up' : bpTrendLabel === 'downward' ? 'down' : bpTrendLabel === 'flat' ? 'flat' : 'unknown';
    return selectEducationRules({ bpTrend: trend });
  }, [bpTrendLabel]);

  const explanation = useMemo(() => {
    const parts = [];
    if (bpAvg.sys && bpAvg.dia) {
      parts.push(`Your average BP was ${bpAvg.sys.toFixed(0)}/${bpAvg.dia.toFixed(0)}.`);
    }
    if (bpTrendLabel) {
      parts.push(`Your systolic BP trended ${bpTrendLabel} over ${range}.`);
    }
    if (weightDelta !== null) {
      const direction = weightDelta > 0 ? 'increased' : weightDelta < 0 ? 'decreased' : 'stayed flat';
      parts.push(`Weight ${direction} by ${Math.abs(weightDelta).toFixed(1)} kg.`);
    }
    return parts.length ? parts.join(' ') : 'Not enough data for insights yet.';
  }, [bpAvg, bpTrendLabel, weightDelta, range]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>Longitudinal trends at a glance.</Text>

        <SectionCard>
          <Text style={styles.sectionTitle}>Today's nudge</Text>
          {nudgeLoading ? (
            <Text style={styles.value}>Loading nudge…</Text>
          ) : nudge ? (
            <Text style={styles.value}>{nudge.message}</Text>
          ) : (
            <Text style={styles.value}>No nudge yet.</Text>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Weekly care plan</Text>
          {carePlanLoading ? (
            <Text style={styles.value}>Building your plan…</Text>
          ) : carePlan ? (
            <>
              <Text style={styles.value}>{carePlan.summary}</Text>
              <View style={styles.planList}>
                {carePlan.actions.map((action, index) => (
                  <View key={`${action.title}-${index}`} style={styles.planCard}>
                    <Text style={styles.planTitle}>{action.title}</Text>
                    <Text style={styles.planDetail}>{action.detail}</Text>
                    <Text style={styles.planMeta}>
                      {action.metric} · {action.target}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.value}>Log more vitals to generate a plan.</Text>
          )}
        </SectionCard>

        <SectionCard>
          <Text style={styles.sectionTitle}>Risk forecast</Text>
          {forecastLoading ? (
            <Text style={styles.value}>Loading forecast…</Text>
          ) : forecast ? (
            <>
              <Text style={styles.value}>{forecast.explanation}</Text>
              <View style={styles.forecastRow}>
                {forecast.horizons.map((point) => (
                  <View key={point.days} style={styles.forecastCard}>
                    <Text style={styles.forecastLabel}>{point.days}d</Text>
                    <Text style={styles.forecastValue}>{point.score.toFixed(2)}</Text>
                    <Text style={styles.forecastBand}>{point.band.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.forecastMeta}>Confidence: {forecast.confidence}</Text>
            </>
          ) : (
            <Text style={styles.value}>Not enough data for a forecast.</Text>
          )}
        </SectionCard>

        <View style={styles.toggleRow}>
          {(['7d', '30d', '90d'] as RangeKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setRange(key)}
              style={[styles.toggle, range === key && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, range === key && styles.toggleTextActive]}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : error ? (
          <SectionCard>
            <Text style={styles.error}>{error}</Text>
          </SectionCard>
        ) : !hasTrendData ? (
          <SectionCard>
            <EmptyState
              title="No trends yet"
              description="Add a BP or weight entry to start seeing insights."
              actionLabel="Add vitals"
              onAction={() => navigation.navigate('Vitals' as never, { screen: 'AddVitals' } as never)}
            />
          </SectionCard>
        ) : (
          <>
            <SectionCard>
              <Text style={styles.sectionTitle}>Averages</Text>
              <Text style={styles.metric}>
                BP Average: {formatNumber(bpAvg.sys, 0)}/{formatNumber(bpAvg.dia, 0)} mmHg
              </Text>
              <Text style={styles.metric}>
                Weight Change: {weightDelta === null ? '—' : `${weightDelta.toFixed(1)} kg`}
              </Text>
              <Text style={styles.metric}>BP Trend: {bpTrendLabel ?? '—'}</Text>
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Insight</Text>
              <Text style={styles.value}>{explanation}</Text>
              {educationRules.map((rule) => (
                <EducationCard key={rule.id} rule={rule} />
              ))}
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Systolic Trend</Text>
              <View onLayout={handleLayoutFactory(setChartWidth, chartWidth)} style={styles.chart}>
                <SimpleLineChart
                  width={chartWidth}
                  height={180}
                  data={bpRange
                    .map((point) => (typeof point.systolic === 'number' ? point.systolic : null))
                    .filter((value): value is number => typeof value === 'number')}
                  color={theme.colors.primaryDark}
                />
              </View>
            </SectionCard>

            <SectionCard>
              <Text style={styles.sectionTitle}>Weight Trend</Text>
              <View onLayout={handleLayoutFactory(setChartWidth, chartWidth)} style={styles.chart}>
                <SimpleLineChart
                  width={chartWidth}
                  height={180}
                  data={weightRange
                    .map((point) => (typeof point.kg === 'number' ? point.kg : null))
                    .filter((value): value is number => typeof value === 'number')}
                  color={theme.colors.primary}
                />
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function handleLayoutFactory(setter: (width: number) => void, current: number) {
  return (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width && width !== current) setter(width);
  };
}

function SimpleLineChart({
  width,
  height,
  data,
  color,
}: {
  width: number;
  height: number;
  data: number[];
  color: string;
}) {
  if (!width || data.length < 2) {
    return (
      <View style={[styles.chartPlaceholder, { height }]}>
        <Text style={styles.chartPlaceholderText}>Not enough data</Text>
      </View>
    );
  }

  const padding = 10;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * usableWidth;
    const y = padding + (1 - (value - min) / range) * usableHeight;
    return `${x},${y}`;
  });

  return (
    <Svg width={width} height={height}>
      <Polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function filterRange(data: TrendMeasurement[], days: number) {
  return data.slice(0, days).reverse();
}

function averageBp(data: TrendMeasurement[]) {
  const sys = data.map((d) => d.systolic).filter((v) => typeof v === 'number') as number[];
  const dia = data.map((d) => d.diastolic).filter((v) => typeof v === 'number') as number[];
  return {
    sys: sys.length ? sys.reduce((a, b) => a + b, 0) / sys.length : null,
    dia: dia.length ? dia.reduce((a, b) => a + b, 0) / dia.length : null,
  };
}

function weightChange(data: TrendMeasurement[]) {
  if (data.length < 2) return null;
  const first = data[0]?.kg;
  const last = data[data.length - 1]?.kg;
  if (typeof first !== 'number' || typeof last !== 'number') return null;
  return last - first;
}

function linearSlope(points: { x: number; y: number }[]) {
  if (points.length < 2) return 0;
  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  const num = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const den = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function slopeLabel(slope: number) {
  if (slope === 0) return null;
  if (Math.abs(slope) < 0.05) return 'flat';
  return slope > 0 ? 'upward' : 'downward';
}

function formatNumber(value: number | null, digits: number) {
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
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 13,
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
  metric: {
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 6,
  },
  chart: {
    height: 180,
  },
  chartPlaceholder: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: 15,
    color: theme.colors.text,
  },
  forecastRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  forecastCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.input,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  forecastLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  forecastValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  forecastBand: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    fontWeight: '600',
    marginTop: 4,
  },
  forecastMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  planList: {
    marginTop: 12,
    gap: 10,
  },
  planCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  planDetail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  planMeta: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    marginTop: 6,
  },
  error: {
    color: theme.colors.danger,
  },
});
