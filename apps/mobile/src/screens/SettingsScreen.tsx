import { StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '../components/SectionCard';
import { getApiBaseUrl } from '../api/http';
import { theme } from '../theme';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Environment and app info</Text>

      <SectionCard>
        <Text style={styles.label}>API Base URL</Text>
        <Text style={styles.value}>{getApiBaseUrl()}</Text>
        <Text style={styles.helper}>
          Set EXPO_PUBLIC_API_BASE_URL in your .env file to point at your server.
        </Text>
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
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
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
  helper: {
    marginTop: 10,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
