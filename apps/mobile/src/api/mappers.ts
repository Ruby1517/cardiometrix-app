import { AdherenceLog, LabEntry, Medication, SymptomEntry, VitalEntry } from './types';

export function mapVitalEntry(row: any): VitalEntry {
  return {
    id: String(row.id ?? row._id),
    measuredAt: row.measuredAt ? new Date(row.measuredAt).toISOString() : new Date().toISOString(),
    systolic: row.systolic ?? row.payload?.systolic,
    diastolic: row.diastolic ?? row.payload?.diastolic,
    pulse: row.pulse ?? row.payload?.pulse,
    weight: row.weight ?? row.payload?.kg,
    source: row.source,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
  };
}

export function mapSymptomEntry(row: any): SymptomEntry {
  const symptoms = row.symptoms ?? {};
  const list = Object.entries(symptoms)
    .filter(([key, value]) => key !== 'otherText' && Boolean(value))
    .map(([key]) => key);
  if (symptoms.otherText) {
    list.push(symptoms.otherText);
  }
  return {
    id: String(row.id ?? row._id),
    createdAt: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : row.checkedAt
        ? new Date(row.checkedAt).toISOString()
        : new Date().toISOString(),
    severity: Number(row.severity ?? 1),
    symptoms: list,
    notes: row.notes || undefined,
  };
}

export function mapMedication(row: any): Medication {
  return {
    id: String(row.id ?? row._id),
    name: row.name,
    dose: row.dose,
    schedule: row.schedule,
    startDate: row.startDate ? new Date(row.startDate).toISOString() : undefined,
    notes: row.notes || undefined,
  };
}

export function mapMedicationWithAdherence(row: any) {
  return {
    medication: mapMedication(row),
    streak: Number(row.streak ?? 0),
    last7: Array.isArray(row.last7) ? row.last7 : [],
  };
}

export function mapAdherenceLog(row: any): AdherenceLog {
  return {
    id: String(row.id ?? row._id ?? `${row.medicationId}-${row.date}`),
    medicationId: String(row.medicationId),
    date: row.date,
    status: row.status,
  };
}

export function mapLabEntry(row: any): LabEntry {
  const payload = row.payload ?? row;
  return {
    id: String(row.id ?? row._id),
    type: row.type,
    measuredAt: row.measuredAt ? new Date(row.measuredAt).toISOString() : new Date().toISOString(),
    a1cPercent: payload?.percent ?? payload?.a1cPercent,
    total: payload?.total,
    ldl: payload?.ldl,
    hdl: payload?.hdl,
    triglycerides: payload?.triglycerides,
    source: row.source,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
  };
}
