import { z } from 'zod';

export const sharedHealthRoleSchema = z.enum(['patient', 'clinician', 'admin']);

export type SharedHealthRole = z.infer<typeof sharedHealthRoleSchema>;
