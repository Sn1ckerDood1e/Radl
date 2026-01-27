import { z } from 'zod';

/**
 * Common region codes for rowing (ISO 3166-1 alpha-2).
 * Used for Regatta Central region filtering preferences.
 */
export const REGATTA_REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
] as const;

export const VALID_REGION_CODES = REGATTA_REGIONS.map(r => r.code);

/**
 * ISO 3166-1 alpha-2 country code validation pattern.
 * Matches RC API expectations for region filtering.
 */
const regionCodeSchema = z.string()
  .length(2, 'Region code must be exactly 2 characters')
  .regex(/^[A-Z]{2}$/, 'Region code must be uppercase letters (ISO 3166-1 alpha-2)');

/**
 * Schema for updating team settings.
 */
export const updateTeamSettingsSchema = z.object({
  damageNotifyUserIds: z.array(z.string().uuid()).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  // Readiness threshold fields
  readinessInspectSoonDays: z.number().int().min(1).max(365).optional(),
  readinessNeedsAttentionDays: z.number().int().min(1).max(365).optional(),
  readinessOutOfServiceDays: z.number().int().min(1).max(365).optional(),
  // Regatta Central region filtering
  regattaRegions: z.array(regionCodeSchema).max(10, 'Maximum 10 regions').optional(),
});

/**
 * Schema for regatta regions field only.
 * Used for targeted region filter updates.
 */
export const regattaRegionsSchema = z.object({
  regattaRegions: z.array(regionCodeSchema),
});

export type UpdateTeamSettingsInput = z.infer<typeof updateTeamSettingsSchema>;
export type RegattaRegionsInput = z.infer<typeof regattaRegionsSchema>;
