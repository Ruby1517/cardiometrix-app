import { useState } from 'react';
import { Button, Share, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/auth';
import { sendTestNotification } from '../api/devices';
import { createShareLink } from '../api/clinician';
import { ProfileStackParamList } from '../utils/navigation';
import { NavigationProp } from '@react-navigation/native';
import { theme } from '../theme';

export function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [notifyStatus, setNotifyStatus] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Account, settings, and preferences.</Text>

        {user ? (
          <View style={styles.card}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.value}>{user.name}</Text>
            <Text style={styles.meta}>{user.email}</Text>
            <View style={styles.actions}>
              <View style={styles.primaryButton}>
                <Button title="Sign out" onPress={() => logout()} color="#ffffff" />
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.primaryButtonAlt}>
                <Button title="Reminders" onPress={() => navigation.navigate('Reminders')} color={theme.colors.primaryDark} />
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.primaryButtonAlt}>
                <Button title="Data Import" onPress={() => navigation.navigate('DataImport')} color={theme.colors.primaryDark} />
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.primaryButtonAlt}>
                <Button title="Care Team" onPress={() => navigation.navigate('CareTeam')} color={theme.colors.primaryDark} />
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.primaryButtonAlt}>
                <Button
                  title="Share Clinician Report"
                  onPress={async () => {
                    setShareStatus('');
                    try {
                      const res = await createShareLink();
                      await Share.share({
                        message: `CardioMetrix report link (expires ${new Date(res.expiresAt).toLocaleDateString()}): ${res.url}`,
                        url: res.url,
                      });
                      setShareStatus('Share link created.');
                    } catch (err) {
                      setShareStatus(err instanceof Error ? err.message : 'Failed to create share link.');
                    }
                  }}
                  color={theme.colors.primaryDark}
                />
              </View>
              {shareStatus ? <Text style={styles.meta}>{shareStatus}</Text> : null}
            </View>
            {__DEV__ && (
              <View style={styles.actions}>
                <View style={styles.primaryButtonAlt}>
                  <Button
                    title="Send Test Notification"
                    onPress={async () => {
                      setNotifyStatus('');
                      try {
                        await sendTestNotification();
                        setNotifyStatus('Sent test notification.');
                      } catch (err) {
                        setNotifyStatus(err instanceof Error ? err.message : 'Failed to send test notification.');
                      }
                    }}
                    color={theme.colors.primaryDark}
                  />
                </View>
                {notifyStatus ? <Text style={styles.meta}>{notifyStatus}</Text> : null}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Sign in</Text>
            <Text style={styles.value}>Sign in or create a new account.</Text>
            <View style={styles.actions}>
              <View style={styles.primaryButton}>
                <Button title="Continue to Login" onPress={() => navigation.navigate('Login')} color="#ffffff" />
              </View>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
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
  },
  card: {
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  actions: {
    marginTop: 12,
  },
  error: {
    color: theme.colors.danger,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  primaryButtonAlt: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
});
