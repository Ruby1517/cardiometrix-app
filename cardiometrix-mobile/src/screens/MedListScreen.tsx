import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { SectionCard } from '../components/SectionCard';
import { EmptyState } from '../components/EmptyState';
import { fetchMedications, logAdherence, MedicationWithAdherence } from '../api/medications';
import { fetchMedicationInsights, MedicationInsight } from '../api/medicationInsights';
import { theme } from '../theme';

export function MedListScreen() {
  const [meds, setMeds] = useState<MedicationWithAdherence[]>([]);
  const [insights, setInsights] = useState<MedicationInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, insightData] = await Promise.all([fetchMedications(), fetchMedicationInsights()]);
      setMeds(data);
      setInsights(insightData);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdherence = async (medicationId: string, status: 'taken' | 'missed') => {
    await logAdherence(medicationId, status);
    await load();
  };

  return (
    <Screen>
      <FlatList
        data={meds}
        keyExtractor={(item) => item.medication.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Medications</Text>
              <Text style={styles.quickAdd} onPress={() => navigation.navigate('MedForm' as never)}>
                Quick Add
              </Text>
            </View>
            <SectionCard>
              <Text style={styles.sectionTitle}>Efficacy Insights</Text>
              {insights.length === 0 ? (
                <Text style={styles.emptySubtitle}>No active medications to analyze yet.</Text>
              ) : (
                insights.map((insight) => (
                  <View key={insight.medicationId} style={styles.insightCard}>
                    <Text style={styles.insightTitle}>{insight.name}</Text>
                    <Text style={styles.insightMeta}>
                      {insight.dose} · {insight.schedule} · Started {insight.startDate}
                    </Text>
                    {insight.adherenceRate !== null ? (
                      <Text style={styles.insightMeta}>Adherence {insight.adherenceRate}%</Text>
                    ) : null}
                    <Text style={styles.insightSummary}>{insight.summary}</Text>
                  </View>
                ))
              )}
            </SectionCard>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="No medications yet"
            description="Add medications to track adherence and insights."
            actionLabel="Add meds"
            onAction={() => navigation.navigate('MedForm' as never)}
          />
        }
        renderItem={({ item }) => (
          <SectionCard>
            <View style={styles.row}>
              <Text style={styles.title}>{item.medication.name}</Text>
              <Text
                style={styles.edit}
                onPress={() =>
                  navigation.navigate('MedForm' as never, { medicationId: item.medication.id } as never)
                }
              >
                Edit
              </Text>
            </View>
            <Text style={styles.subtitle}>
              {item.medication.dose} · {item.medication.schedule}
            </Text>
            <Text style={styles.streak}>Streak: {item.streak} days</Text>
            <View style={styles.indicators}>
              {item.last7.map((day) => (
                <View
                  key={day.date}
                  style={[
                    styles.dot,
                    day.status === 'taken'
                      ? styles.dotTaken
                      : day.status === 'missed'
                        ? styles.dotMissed
                        : styles.dotNone,
                  ]}
                />
              ))}
            </View>
            <View style={styles.actions}>
              <Text
                style={styles.actionTaken}
                onPress={() => handleAdherence(item.medication.id, 'taken')}
              >
                Taken
              </Text>
              <Text
                style={styles.actionMissed}
                onPress={() => handleAdherence(item.medication.id, 'missed')}
              >
                Missed
              </Text>
            </View>
          </SectionCard>
        )}
      />
    </Screen>
  );
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
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  edit: {
    fontSize: 13,
    color: theme.colors.primaryDark,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  insightCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 10,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  insightMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  insightSummary: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 6,
  },
  streak: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  dotTaken: {
    backgroundColor: theme.colors.success,
  },
  dotMissed: {
    backgroundColor: theme.colors.danger,
  },
  dotNone: {
    backgroundColor: theme.colors.border,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionTaken: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '600',
    marginRight: 12,
  },
  actionMissed: {
    fontSize: 14,
    color: theme.colors.danger,
    fontWeight: '600',
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
});
