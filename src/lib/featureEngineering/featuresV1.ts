import { z } from 'zod';

export const featuresV1Schema = z.object({
  user_id: z.string().optional(),
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bp_sys_trend_14d: z.number(),
  bp_sys_var_7d: z.number(),
  bp_dia_trend_14d: z.number(),
  bp_dia_var_7d: z.number(),
  hrv_z_7d: z.number(),
  rhr_z_7d: z.number(),
  steps_z_7d: z.number(),
  sleep_debt_hours_7d: z.number(),
  weight_trend_14d: z.number(),
  glucose_trend_14d: z.number(),
  a1c_latest: z.number().nullable().optional(),
  ldl_latest: z.number().nullable().optional(),
  adherence_nudge_7d: z.number().min(0).max(1),
});

export type FeaturesV1 = z.infer<typeof featuresV1Schema>;

export type FeatureCoverage = {
  totalPoints30d: number;
  bpPoints14d: number;
  weightPoints14d: number;
  stepsPoints7d: number;
  sleepPoints7d: number;
};

export const FEATURE_CLAMPS = {
  bpTrend: { min: -5, max: 5 },
  bpVar: { min: 0, max: 40 },
  z: { min: -4, max: 4 },
  sleepDebt: { min: 0, max: 4 },
  weightTrend: { min: -2, max: 2 },
  glucoseTrend: { min: -20, max: 20 },
  adherence: { min: 0, max: 1 },
} as const;
