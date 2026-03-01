export type RootStackParamList = {
  Tabs: undefined;
  Auth: undefined;
};

export type RootTabParamList = {
  Vitals: undefined;
  Symptoms: undefined;
  Meds: undefined;
  Insights: undefined;
  Timeline: undefined;
  Profile: undefined;
};

export type VitalsStackParamList = {
  VitalsList: undefined;
  AddVitals: undefined;
  AddLabs: undefined;
  Goals: undefined;
};

export type SymptomsStackParamList = {
  SymptomsHistory: undefined;
  SymptomCheckin: undefined;
};

export type MedsStackParamList = {
  MedsList: undefined;
  MedForm: { medicationId?: string } | undefined;
};

export type InsightsStackParamList = {
  HealthOverview: undefined;
  InsightsDetail: undefined;
  SummaryDetails: { period?: 'week' | 'month' } | undefined;
};

export type TimelineStackParamList = {
  TimelineHome: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Login: undefined;
  Reminders: undefined;
  DataImport: undefined;
  CareTeam: undefined;
};

export type AuthStackParamList = {
  Login: { mode?: 'login' | 'register' } | undefined;
};
