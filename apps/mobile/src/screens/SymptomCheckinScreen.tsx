import type React from 'react';
import { Controller, useForm } from 'react-hook-form';
import Slider from '@react-native-community/slider';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { createSymptom } from '../api/symptoms';
import type { Control } from 'react-hook-form';
import { theme } from '../theme';

type FormValues = {
  headache: boolean;
  dizziness: boolean;
  fatigue: boolean;
  chestDiscomfort: boolean;
  shortnessOfBreath: boolean;
  swelling: boolean;
  otherText: string;
  severity: number;
  notes: string;
};

const DEFAULT_VALUES: FormValues = {
  headache: false,
  dizziness: false,
  fatigue: false,
  chestDiscomfort: false,
  shortnessOfBreath: false,
  swelling: false,
  otherText: '',
  severity: 5,
  notes: '',
};

export function SymptomCheckinScreen() {
  const navigation = useNavigation();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  const onSubmit = handleSubmit(async (values) => {
    await createSymptom({
      severity: Math.round(values.severity),
      symptoms: {
        headache: values.headache,
        dizziness: values.dizziness,
        fatigue: values.fatigue,
        chestDiscomfort: values.chestDiscomfort,
        shortnessOfBreath: values.shortnessOfBreath,
        swelling: values.swelling,
        otherText: values.otherText.trim(),
      },
      notes: values.notes.trim(),
    });
    navigation.goBack();
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Symptom Check-in</Text>
        <Text style={styles.subtitle}>Log how you feel right now.</Text>

        <Text style={styles.sectionTitle}>Checklist</Text>
        <SymptomToggle label="Headache" name="headache" control={control} />
        <SymptomToggle label="Dizziness" name="dizziness" control={control} />
        <SymptomToggle label="Fatigue" name="fatigue" control={control} />
        <SymptomToggle label="Chest discomfort" name="chestDiscomfort" control={control} />
        <SymptomToggle label="Shortness of breath" name="shortnessOfBreath" control={control} />
        <SymptomToggle label="Swelling" name="swelling" control={control} />

        <Field label="Other" error={errors.otherText?.message}>
          <Controller
            control={control}
            name="otherText"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Other symptoms"
                style={styles.input}
              />
            )}
          />
        </Field>

        <Field label="Severity (1-10)" error={errors.severity?.message}>
          <Controller
            control={control}
            name="severity"
            rules={{
              validate: (value) =>
                value >= 1 && value <= 10 ? true : 'Severity must be 1-10.',
            }}
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.sliderValue}>{Math.round(value)}</Text>
                <Slider
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={value}
                  onValueChange={onChange}
                  minimumTrackTintColor="#2563eb"
                  maximumTrackTintColor="#e5e7eb"
                />
              </>
            )}
          />
        </Field>

        <Field label="Notes" error={errors.notes?.message}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Any extra detail?"
                style={[styles.input, styles.notes]}
                multiline
              />
            )}
          />
        </Field>

        <View style={styles.primaryButton}>
          <Button title={isSubmitting ? 'Saving...' : 'Save Check-in'} onPress={onSubmit} color="#ffffff" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SymptomToggle({
  label,
  name,
  control,
}: {
  label: string;
  name: keyof FormValues;
  control: Control<FormValues>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleValue} onPress={() => onChange(!value)}>
            {value ? 'Yes' : 'No'}
          </Text>
        </View>
      )}
    />
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
  sectionTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
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
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: theme.colors.danger,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  toggleLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
  toggleValue: {
    fontSize: 14,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
});
