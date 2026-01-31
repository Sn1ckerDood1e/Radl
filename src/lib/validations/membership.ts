import { z } from 'zod';

/**
 * Role enum matching Prisma Role type.
 * Used for validation in membership operations.
 */
const roleEnum = z.enum(['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT']);

/**
 * Schema for adding a user to a club.
 *
 * Used by super admin to directly create club memberships
 * without going through the invitation flow.
 */
export const addMembershipSchema = z.object({
  clubId: z.string().uuid('Invalid club ID'),
  userId: z.string().uuid('Invalid user ID'),
  roles: z
    .array(roleEnum)
    .min(1, 'At least one role is required')
    .default(['ATHLETE']),
});

export type AddMembershipInput = z.infer<typeof addMembershipSchema>;

/**
 * Schema for updating membership roles.
 *
 * Only roles can be updated - clubId and userId are immutable.
 * To change a user's club, remove and re-add the membership.
 */
export const updateMembershipSchema = z.object({
  roles: z
    .array(roleEnum)
    .min(1, 'At least one role is required'),
});

export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
