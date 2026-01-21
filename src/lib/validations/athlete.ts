import { z } from 'zod';

export const sidePreferenceSchema = z.enum(['PORT', 'STARBOARD', 'BOTH']);

export const updateAthleteProfileSchema = z.object({
  displayName: z.string().max(100).optional().nullable(),
  sidePreference: sidePreferenceSchema.optional().nullable(),
  canBow: z.boolean().optional(),
  canCox: z.boolean().optional(),
  phone: z.string().max(20).optional().nullable(),
  emergencyName: z.string().max(100).optional().nullable(),
  emergencyPhone: z.string().max(20).optional().nullable(),
});

export type UpdateAthleteProfileInput = z.infer<typeof updateAthleteProfileSchema>;
