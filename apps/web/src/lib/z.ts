import { z } from 'zod';

export const zRegister = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['patient','clinician','admin']).optional().default('patient')
});

export const zLogin = z.object({ email: z.string().email(), password: z.string().min(8) });

export const zMeasurement = z.object({
  type: z.enum(['bp','weight','steps','sleep','hrv','a1c','lipid']),
  measuredAt: z.string().datetime(),
  source: z.string().default('manual'),
  payload: z.union([
    z.object({ systolic: z.number().int().positive(), diastolic: z.number().int().positive(), pulse: z.number().int().positive().optional() }),
    z.object({ kg: z.number().positive() }),
    z.object({ count: z.number().int().nonnegative() }),
    z.object({ hours: z.number().nonnegative(), efficiency: z.number().min(0).max(1).optional() }),
    z.object({ rmssd: z.number().positive() }),
    z.object({ percent: z.number().min(0).max(20) }), // A1c as percentage
    z.object({ total: z.number().positive(), ldl: z.number().positive().optional(), hdl: z.number().positive().optional(), triglycerides: z.number().positive().optional() }) // Lipid panel
  ])
});