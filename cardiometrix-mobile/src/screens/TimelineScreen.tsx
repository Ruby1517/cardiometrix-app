import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { fetchTimeline, TimelineRange } from '../api/timeline';
import { TimelineEvent } from '../api/types';
import { formatEventTime, groupTimelineEvents } from '../utils/timeline';
import { theme } from '../theme';

type FilterType = 'all' | 'vital' | 'symptom' | 'med' | 'lab';

export function TimelineScreen() {
  const navigation = useNavigation();
  const [range, setRange] = useState<TimelineRange>('30d');
  const [filter, setFilter] = useState<FilterType>('all');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTimeline(range);
      setEvents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load timeline.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const groups = useMemo(() => groupTimelineEvents(filteredEvents), [filteredEvents]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.subtitle}>A simple feed of your recent health updates.</Text>

        <View style={styles.row}>
          {(['7d', '30d', '90d'] as TimelineRange[]).map((key) => (
            <ToggleButton key={key} label={key.toUpperCase()} active={range === key} onPress={() => setRange(key)} />
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', 'vital', 'symptom', 'med', 'lab'] as FilterType[]).map((type) => (
            <FilterPill key={type} label={labelForFilter(type)} active={filter === type} onPress={() => setFilter(type)} />
          ))}
        </ScrollView>

        {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
        {error ? (
          <SectionCard>
            <Text style={styles.errorTitle}>We could not load your timeline.</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </SectionCard>
        ) : null}

        {!loading && !error && groups.length === 0 ? (
          <SectionCard>
            <EmptyState
              title="No timeline entries yet"
              description="Add vitals, symptoms, medications, or labs to build your personal history."
              actionLabel="Add vitals"
              onAction={() => navigation.navigate('Vitals' as never, { screen: 'AddVitals' } as never)}
            />
          </SectionCard>
        ) : null}

        {!loading && !error
          ? groups.map((group) => (
              <SectionCard key={group.dateKey}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                {group.events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>{formatEventTime(event.timestamp)}</Text>
                    </View>
                    <Text style={styles.eventSummary}>{event.summary}</Text>
                    <TouchableOpacity onPress={() => navigateToDetail(navigation, event.type)}>
                      <Text style={styles.eventLink}>View details</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </SectionCard>
            ))
          : null}
      </ScrollView>
    </Screen>
  );
}

function labelForFilter(type: FilterType) {
  if (type === 'vital') return 'Vitals';
  if (type === 'symptom') return 'Symptoms';
  if (type === 'med') return 'Meds';
  if (type === 'lab') return 'Labs';
  return 'All';
}

function navigateToDetail(navigation: ReturnType<typeof useNavigation>, type: TimelineEvent['type']) {
  if (type === 'symptom') {
    navigation.navigate('Symptoms' as never, { screen: 'SymptomsHistory' } as never);
    return;
  }
  if (type === 'med') {
    navigation.navigate('Meds' as never, { screen: 'MedsList' } as never);
    return;
  }
  navigation.navigate('Vitals' as never, { screen: 'VitalsList' } as never);
}

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
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
  filters: {
    paddingVertical: 4,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  groupTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  eventSummary: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
  },
  eventLink: {
    fontSize: 12,
    color: theme.colors.primaryDark,
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
