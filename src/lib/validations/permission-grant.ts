import { z } from 'zod';

/**
 * Preset durations for temporary access grants.
 * Per CONTEXT.md: "time-based with preset durations"
 */
export const grantDurations = {
  '1_day': { label: '1 day', hours: 24 },
  '3_days': { label: '3 days', hours: 72 },
  '1_week': { label: '1 week', hours: 168 },
  '2_weeks': { label: '2 weeks', hours: 336 },
  '1_month': { label: '1 month', hours: 720 },
} as const;

export type GrantDuration = keyof typeof grantDurations;

/**
 * Valid roles that can be granted temporarily
 */
const grantableRoles = ['CLUB_ADMIN', 'COACH'] as const;

/**
 * Schema for creating a permission grant
 */
export const createGrantSchema = z.object({
  clubId: z.string().uuid(),
  userId: z.string().uuid(),  // Who receives the grant
  roles: z.array(z.enum(grantableRoles)).min(1),
  duration: z.enum(['1_day', '3_days', '1_week', '2_weeks', '1_month']),
  reason: z.string().min(1).max(500).optional(),
});

/**
 * Schema for revoking a grant
 */
export const revokeGrantSchema = z.object({
  grantId: z.string().uuid(),
});

export type CreateGrantInput = z.infer<typeof createGrantSchema>;
export type RevokeGrantInput = z.infer<typeof revokeGrantSchema>;
