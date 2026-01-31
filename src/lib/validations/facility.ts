import { z } from 'zod';

/**
 * Validation schema for creating a new facility.
 *
 * Used by super admin to create facilities in the platform.
 * Slug is auto-generated from name if not provided.
 */
export const createFacilitySchema = z.object({
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
  address: z
    .string()
    .max(200, 'Address must be at most 200 characters')
    .optional(),
  city: z
    .string()
    .max(100, 'City must be at most 100 characters')
    .optional(),
  state: z
    .string()
    .max(100, 'State must be at most 100 characters')
    .optional(),
  country: z
    .string()
    .max(2, 'Country must be a 2-letter code')
    .default('US'),
  timezone: z
    .string()
    .default('America/New_York'),
  phone: z
    .string()
    .max(20, 'Phone must be at most 20 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .or(z.literal(''))
    .optional(),
  website: z
    .string()
    .url('Invalid URL format')
    .or(z.literal(''))
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;

/**
 * Validation schema for updating a facility.
 *
 * All fields are optional - only provided fields are updated.
 */
export const updateFacilitySchema = z.object({
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
  address: z
    .string()
    .max(200, 'Address must be at most 200 characters')
    .optional()
    .nullable(),
  city: z
    .string()
    .max(100, 'City must be at most 100 characters')
    .optional()
    .nullable(),
  state: z
    .string()
    .max(100, 'State must be at most 100 characters')
    .optional()
    .nullable(),
  country: z
    .string()
    .max(2, 'Country must be a 2-letter code')
    .optional(),
  timezone: z
    .string()
    .optional(),
  phone: z
    .string()
    .max(20, 'Phone must be at most 20 characters')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('Invalid email format')
    .or(z.literal(''))
    .optional()
    .nullable(),
  website: z
    .string()
    .url('Invalid URL format')
    .or(z.literal(''))
    .optional()
    .nullable(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable(),
});

export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
