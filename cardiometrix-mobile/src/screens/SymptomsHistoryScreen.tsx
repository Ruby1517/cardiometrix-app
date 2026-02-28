import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { fetchSymptoms } from '../api/symptoms';
import { SymptomEntry } from '../api/types';
import { getQueueSummary, syncPendingQueue } from '../store/offlineQueue';
import { theme } from '../theme';

export function SymptomsHistoryScreen() {
  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const [pending, setPending] = useState({ pending: 0, failed: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSymptoms();
      setEntries(data);
      const summary = await getQueueSummary('symptoms');
      setPending(summary);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Symptoms Check-ins</Text>
              <Text
                style={styles.quickAdd}
                onPress={() => navigation.navigate('SymptomCheckin' as never)}
              >
                Quick Add
              </Text>
            </View>
            {(pending.pending || pending.failed) ? (
              <View style={styles.pending}>
                <Text style={styles.pendingText}>
                  Pending Sync ({pending.pending + pending.failed})
                </Text>
                {pending.failed ? (
                  <Text
                    style={styles.retry}
                    onPress={async () => {
                      await syncPendingQueue();
                      const summary = await getQueueSummary('symptoms');
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
            title="No check-ins yet"
            description="Log how you feel to see patterns over time."
            actionLabel="Add symptoms"
            onAction={() => navigation.navigate('SymptomCheckin' as never)}
          />
        }
        renderItem={({ item }) => (
          <SectionCard>
            <View style={styles.row}>
              <Text style={styles.type}>Severity {item.severity}/10</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.value}>{formatSymptoms(item.symptoms)}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </SectionCard>
        )}
      />
    </Screen>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatSymptoms(symptoms: SymptomEntry['symptoms']) {
  return symptoms.length ? symptoms.join(' • ') : 'No symptoms selected';
}

const styles = StyleSheet.create({
  listContent: {
    padding: theme.spacing.screen,
  },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  quickAdd: {
    fontSize: 14,
    color: theme.colors.primaryDark,
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
    fontSize: 15,
    color: theme.colors.text,
  },
  notes: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
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
