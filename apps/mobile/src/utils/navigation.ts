export type RootStackParamList = {
  Tabs: undefined;
  Auth: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  AddData: undefined;
  Settings: undefined;
};

export type AddDataStackParamList = {
  VitalsList: undefined;
  AddVitals: undefined;
  AddLabs: undefined;
  Goals: undefined;
  DataImport: undefined;
};

export type HomeStackParamList = {
  HealthOverview: undefined;
};

export type SettingsStackParamList = {
  ProfileHome: undefined;
  Login: undefined;
  Reminders: undefined;
  DataImport: undefined;
  CareTeam: undefined;
};

export type AuthStackParamList = {
  Login: { mode?: 'login' | 'register' } | undefined;
};

// Backward-compatible aliases for screens kept in repo but hidden from MVP nav.
export type VitalsStackParamList = AddDataStackParamList;
export type ProfileStackParamList = SettingsStackParamList;
export type InsightsStackParamList = {
  HealthOverview: undefined;
  InsightsDetail: undefined;
  SummaryDetails: { period?: 'week' | 'month' } | undefined;
};
export type SymptomsStackParamList = {
  SymptomsHistory: undefined;
  SymptomCheckin: undefined;
};
export type MedsStackParamList = {
  MedsList: undefined;
  MedForm: { medicationId?: string } | undefined;
};
export type TimelineStackParamList = {
  TimelineHome: undefined;
};
