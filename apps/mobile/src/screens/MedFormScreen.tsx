import type React from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { createMedication, fetchMedications, updateMedication } from '../api/medications';
import { theme } from '../theme';

type FormValues = {
  name: string;
  dose: string;
  schedule: string;
};

export function MedFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const medicationId = (route.params as { medicationId?: string } | undefined)?.medicationId;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      dose: '',
      schedule: '',
    },
  });

  useEffect(() => {
    if (!medicationId) return;
    fetchMedications().then((meds) => {
      const med = meds.find((m) => m.medication.id === medicationId)?.medication;
      if (!med) return;
      setValue('name', med.name);
      setValue('dose', med.dose);
      setValue('schedule', med.schedule);
    });
  }, [medicationId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (medicationId) {
      await updateMedication(medicationId, values);
    } else {
      await createMedication(values);
    }
    navigation.goBack();
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{medicationId ? 'Edit Medication' : 'Add Medication'}</Text>
        <Text style={styles.subtitle}>Keep dosing details up to date.</Text>

        <Field label="Medication name" error={errors.name?.message}>
          <Controller
            control={control}
            name="name"
            rules={{ required: 'Name is required.' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Lisinopril"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="Dose" error={errors.dose?.message}>
          <Controller
            control={control}
            name="dose"
            rules={{ required: 'Dose is required.' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="10 mg"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="Schedule" error={errors.schedule?.message}>
          <Controller
            control={control}
            name="schedule"
            rules={{ required: 'Schedule is required.' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Once daily, morning"
                style={styles.input}
              />
            )}
          />
        </Field>

        <View style={styles.primaryButton}>
          <Button title={isSubmitting ? 'Saving...' : 'Save Medication'} onPress={onSubmit} color="#ffffff" />
        </View>
      </ScrollView>
    </Screen>
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
  field: {
    marginBottom: 16,
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
