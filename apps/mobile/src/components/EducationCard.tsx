import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { EducationRule } from '../utils/educationRules';
import { theme } from '../theme';

const STORAGE_KEY = 'education_dismissed_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type EducationCardProps = {
  rule: EducationRule;
};

type DismissedMap = Record<string, number>;

export function EducationCard({ rule }: EducationCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (!active) return;
        const dismissed: DismissedMap = value ? JSON.parse(value) : {};
        const lastDismissed = dismissed[rule.id] ?? 0;
        const expired = Date.now() - lastDismissed > THIRTY_DAYS_MS;
        setVisible(expired);
      })
      .catch(() => {
        if (active) setVisible(true);
      });
    return () => {
      active = false;
    };
  }, [rule.id]);

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{rule.title}</Text>
        <TouchableOpacity onPress={() => dismissRule(rule.id, setVisible)} accessibilityRole="button">
          <Text style={styles.dismiss}>Dismiss</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.body}>{rule.body}</Text>
    </View>
  );
}

async function dismissRule(ruleId: string, setVisible: (visible: boolean) => void) {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    const dismissed: DismissedMap = value ? JSON.parse(value) : {};
    dismissed[ruleId] = Date.now();
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(dismissed));
  } catch {
    // ignore storage errors
  } finally {
    setVisible(false);
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 12,
    marginTop: 10,
    backgroundColor: theme.colors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dismiss: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  body: {
    fontSize: 12,
    color: theme.colors.text,
  },
});
