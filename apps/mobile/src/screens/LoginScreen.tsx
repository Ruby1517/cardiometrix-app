import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Screen } from '../components/Screen';
import { useAuthStore } from '../store/auth';
import { apiGet } from '../api/http';
import { theme } from '../theme';
import { useRoute } from '@react-navigation/native';
import { AuthStackParamList } from '../utils/navigation';
import { RouteProp } from '@react-navigation/native';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'login' | 'register';

type LoginValues = {
  email: string;
  password: string;
};

type RegisterValues = {
  name: string;
  email: string;
  password: string;
};

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const { login, register, loginWithGoogle, status } = useAuthStore();
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();

  const googleConfig = useMemo(
    () => ({
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    }),
    []
  );

  const {
    control: loginControl,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
  });

  const {
    control: registerControl,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterValues>({
    defaultValues: { name: '', email: '', password: '' },
  });

  const onLogin = handleLoginSubmit(async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    }
  });

  const onRegister = handleRegisterSubmit(async (values) => {
    setError('');
    try {
      await register(values.name, values.email, values.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    }
  });

  useEffect(() => {
    if (route.params?.mode) {
      setMode(route.params.mode);
    }
  }, [route.params?.mode]);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Welcome back to CardioMetrix.' : 'Start tracking your health.'}
        </Text>

        {mode === 'login' ? (
          <>
            <Field label="Email" error={loginErrors.email?.message}>
              <Controller
                control={loginControl}
                name="email"
                rules={{ required: 'Email is required.' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@email.com"
                    style={styles.input}
                  />
                )}
              />
            </Field>
            <Field label="Password" error={loginErrors.password?.message}>
              <Controller
                control={loginControl}
                name="password"
                rules={{ required: 'Password is required.' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="••••••••"
                    style={styles.input}
                  />
                )}
              />
            </Field>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.primaryButton}>
              <Button title={status === 'loading' ? 'Signing in...' : 'Sign in'} onPress={onLogin} color="#ffffff" />
            </View>
          </>
        ) : (
          <>
            <Field label="Name" error={registerErrors.name?.message}>
              <Controller
                control={registerControl}
                name="name"
                rules={{ required: 'Name is required.' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput value={value} onChangeText={onChange} placeholder="Jane Doe" style={styles.input} />
                )}
              />
            </Field>
            <Field label="Email" error={registerErrors.email?.message}>
              <Controller
                control={registerControl}
                name="email"
                rules={{ required: 'Email is required.' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@email.com"
                    style={styles.input}
                  />
                )}
              />
            </Field>
            <Field label="Password" error={registerErrors.password?.message}>
              <Controller
                control={registerControl}
                name="password"
                rules={{ required: 'Password is required.' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="••••••••"
                    style={styles.input}
                  />
                )}
              />
            </Field>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.primaryButton}>
              <Button title={status === 'loading' ? 'Creating...' : 'Create account'} onPress={onRegister} color="#ffffff" />
            </View>
          </>
        )}

        <View style={styles.connectionRow}>
          <Button
            title="Test API Connection"
            onPress={async () => {
              setConnectionStatus('');
              try {
                const res = await apiGet<{ user?: unknown }>('/api/auth/me');
                setConnectionStatus(res?.user ? 'Connected (authenticated)' : 'Connected (unauthenticated)');
              } catch (err) {
                setConnectionStatus(err instanceof Error ? err.message : 'Connection failed.');
              }
            }}
          />
          {connectionStatus ? <Text style={styles.connectionText}>{connectionStatus}</Text> : null}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'New here?' : 'Already have an account?'}
          </Text>
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchLink}>
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        <GoogleLoginBlock
          config={googleConfig}
          disabled={status === 'loading'}
          onError={setError}
          onSuccess={loginWithGoogle}
        />
      </View>
    </Screen>
  );
}

function GoogleLoginBlock({
  config,
  disabled,
  onSuccess,
  onError,
}: {
  config: {
    expoClientId?: string;
    iosClientId?: string;
    webClientId?: string;
  };
  disabled: boolean;
  onSuccess: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  if (!config.iosClientId && !config.expoClientId && !config.webClientId) {
    return (
      <View style={styles.googleBlock}>
        <Text style={styles.googleNote}>Google login is not configured.</Text>
      </View>
    );
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: config.expoClientId,
    iosClientId: config.iosClientId,
    webClientId: config.webClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken;
    if (!idToken) {
      onError('Google login failed: missing id token.');
      return;
    }
    onSuccess(idToken).catch((err) => {
      onError(err instanceof Error ? err.message : 'Google login failed.');
    });
  }, [response, onError, onSuccess]);

  return (
    <View style={styles.googleBlock}>
      <View style={styles.primaryButtonAlt}>
        <Button
          title={disabled ? 'Signing in...' : 'Continue with Google'}
          disabled={!request || disabled}
          onPress={() => {
            onError('');
            promptAsync();
          }}
          color={theme.colors.primaryDark}
        />
      </View>
    </View>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  error: {
    color: theme.colors.danger,
    marginTop: 4,
  },
  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginRight: 6,
  },
  switchLink: {
    fontSize: 13,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  googleBlock: {
    marginTop: 16,
  },
  connectionRow: {
    marginTop: 16,
  },
  connectionText: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  googleNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryButtonAlt: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
});
