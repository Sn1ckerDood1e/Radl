import { z } from 'zod';

/**
 * Validation schema for creating a new club.
 *
 * Used by super admin to create clubs assigned to facilities.
 * Slug is auto-generated from name if not provided.
 */
export const createClubSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1, 'Slug must be at least 1 character')
    .max(50, 'Slug must be at most 50 characters')
    .optional(),
  facilityId: z
    .string()
    .uuid('Invalid facility ID'),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (must be #XXXXXX)')
    .default('#0891b2'), // teal-500
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (must be #XXXXXX)')
    .default('#164e63'), // teal-900
});

export type CreateClubInput = z.infer<typeof createClubSchema>;

/**
 * Validation schema for updating a club.
 *
 * All fields are optional - only provided fields are updated.
 * Note: facilityId cannot be updated here - use move endpoint instead.
 */
export const updateClubSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1, 'Slug must be at least 1 character')
    .max(50, 'Slug must be at most 50 characters')
    .optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (must be #XXXXXX)')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (must be #XXXXXX)')
    .optional(),
  logoUrl: z
    .string()
    .url('Invalid logo URL format')
    .or(z.literal(''))
    .optional()
    .nullable(),
});

export type UpdateClubInput = z.infer<typeof updateClubSchema>;

/**
 * Validation schema for moving a club to a different facility.
 */
export const moveClubSchema = z.object({
  targetFacilityId: z
    .string()
    .uuid('Invalid target facility ID'),
});

export type MoveClubInput = z.infer<typeof moveClubSchema>;
