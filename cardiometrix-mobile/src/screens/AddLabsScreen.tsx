import type React from 'react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { createA1c, createLipid } from '../api/labs';
import { theme } from '../theme';

type FormValues = {
  a1c: string;
  total: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  dateTime: string;
};

export function AddLabsScreen() {
  const navigation = useNavigation();
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 16), []);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      a1c: '',
      total: '',
      ldl: '',
      hdl: '',
      triglycerides: '',
      dateTime: defaultDate,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const a1c = values.a1c ? Number(values.a1c) : undefined;
    const total = values.total ? Number(values.total) : undefined;
    const ldl = values.ldl ? Number(values.ldl) : undefined;
    const hdl = values.hdl ? Number(values.hdl) : undefined;
    const triglycerides = values.triglycerides ? Number(values.triglycerides) : undefined;

    if (!a1c && !total) {
      setError('a1c', { message: 'Enter HbA1c or lipid values.' });
      setError('total', { message: 'Enter HbA1c or lipid values.' });
      return;
    }

    const parsedDate = new Date(values.dateTime);
    if (Number.isNaN(parsedDate.getTime())) {
      setError('dateTime', { message: 'Enter a valid date/time.' });
      return;
    }

    const measuredAt = parsedDate.toISOString();
    const tasks = [];
    if (a1c) {
      tasks.push(createA1c({ percent: a1c, measuredAt }));
    }
    if (total) {
      tasks.push(createLipid({ total, ldl, hdl, triglycerides, measuredAt }));
    }

    await Promise.all(tasks);
    navigation.goBack();
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add Labs</Text>
        <Text style={styles.subtitle}>Track HbA1c and lipid panel results.</Text>

        <SectionTitle>HbA1c</SectionTitle>
        <Field label="HbA1c (%)" error={errors.a1c?.message}>
          <Controller
            control={control}
            name="a1c"
            rules={{
              validate: (value) =>
                !value || (Number(value) >= 3 && Number(value) <= 15) || 'HbA1c must be 3-15%.',
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="5.8"
                style={styles.input}
              />
            )}
          />
        </Field>

        <SectionTitle>Lipid Panel</SectionTitle>
        <Field label="Total" error={errors.total?.message}>
          <Controller
            control={control}
            name="total"
            rules={{
              validate: (value) => !value || Number(value) > 0 || 'Total must be positive.',
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="205"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="LDL">
          <Controller
            control={control}
            name="ldl"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="135"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="HDL">
          <Controller
            control={control}
            name="hdl"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="42"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="Triglycerides">
          <Controller
            control={control}
            name="triglycerides"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="165"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="Date/Time" error={errors.dateTime?.message}>
          <Controller
            control={control}
            name="dateTime"
            rules={{ required: 'Date/time is required.' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DDTHH:mm"
                style={styles.input}
              />
            )}
          />
        </Field>

        <View style={styles.primaryButton}>
          <Button title={isSubmitting ? 'Saving...' : 'Save'} onPress={onSubmit} disabled={isSubmitting} color="#ffffff" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
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
    marginTop: 8,
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
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
});
