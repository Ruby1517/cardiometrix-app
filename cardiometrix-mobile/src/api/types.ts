export type WeeklyRiskSummary = {
  weekStart: string;
  weekEnd: string;
  summaryText: string;
  explanations: string[];
  signals?: {
    trend?: 'improving' | 'stable' | 'worsening';
    deteriorationDetected?: boolean;
  };
  metrics?: {
    risk_score_avg_7d?: number | null;
    risk_score_slope_14d?: number | null;
    bp_sys_avg_7d?: number | null;
    bp_sys_slope_14d?: number | null;
    bp_dia_avg_7d?: number | null;
    bp_dia_slope_14d?: number | null;
    weight_avg_7d?: number | null;
    weight_slope_14d?: number | null;
  };
};

export type WeeklyRiskSummaryResponse = {
  summary: WeeklyRiskSummary | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'clinician' | 'admin';
};

export type VitalEntry = {
  id: string;
  measuredAt: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  weight?: number;
  source?: string;
  createdAt?: string;
};

export type Goal = {
  id: string;
  bpSystolicTarget: number | null;
  bpDiastolicTarget: number | null;
  weightTargetKg: number | null;
  updatedAt?: string;
};

export type Reminder = {
  id: string;
  type: 'vitals' | 'meds';
  time: string;
  enabled: boolean;
  timezone?: string | null;
  updatedAt?: string;
};

export type LabEntry = {
  id: string;
  type: 'a1c' | 'lipid';
  measuredAt: string;
  a1cPercent?: number;
  total?: number;
  ldl?: number;
  hdl?: number;
  triglycerides?: number;
  source?: string;
  createdAt?: string;
};

export type SymptomEntry = {
  id: string;
  createdAt: string;
  severity: number;
  symptoms: string[];
  notes?: string;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  startDate?: string;
  notes?: string;
};

export type AdherenceLog = {
  id: string;
  medicationId: string;
  date: string;
  status: 'taken' | 'missed';
};

export type RiskPoint = {
  date: string;
  score: number;
  band: string;
};

export type TrendMeasurement = {
  date: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  kg?: number;
};

export type TrendsResponse = {
  riskTrend: RiskPoint[];
  measurements: {
    bp: TrendMeasurement[];
    weight: TrendMeasurement[];
  };
};

export type DeviceRegisterPayload = {
  expoPushToken: string;
  platform?: string;
  model?: string;
};

export type Nudge = {
  id: string;
  message: string;
  status?: 'sent' | 'completed' | 'skipped';
  date?: string;
  category?: string;
};

export type NudgeResponse = {
  nudge: Nudge | null;
};

export type TimelineEvent = {
  id: string;
  type: 'vital' | 'symptom' | 'med' | 'lab';
  timestamp: string;
  title: string;
  summary: string;
  data: Record<string, unknown>;
};

export type SummaryResponse = {
  periodStart: string;
  periodEnd: string;
  bp: { avgSys: number | null; avgDia: number | null; trend: 'up' | 'down' | 'flat' | 'unknown' };
  weight: { delta: number | null; trend: 'up' | 'down' | 'flat' | 'unknown' };
  pulse: { avg: number | null };
  symptoms: { count: number; top: string | null };
  meds: { adherenceRate: number | null };
  narrative: string;
};
