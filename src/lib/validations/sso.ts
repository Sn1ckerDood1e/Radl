import { z } from 'zod';

/**
 * Valid roles that can be mapped from SSO
 */
const mappableRoles = ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'] as const;

/**
 * Schema for a single role mapping entry
 */
export const roleMappingSchema = z.object({
  idpValue: z.string().min(1).max(255),  // Value from IDP claim
  radlRoles: z.array(z.enum(mappableRoles)).min(1),
});

/**
 * Schema for SSO configuration update
 */
export const ssoConfigSchema = z.object({
  enabled: z.boolean().optional(),
  ssoProviderId: z.string().optional().nullable(),
  idpDomain: z.string().min(1).max(255).optional().nullable(),
  idpGroupClaim: z.string().min(1).max(100).optional(),
  roleMappings: z.array(roleMappingSchema).optional(),
  defaultRole: z.enum(mappableRoles).optional(),
  allowOverride: z.boolean().optional(),
});

/**
 * Schema for initiating SSO login
 */
export const ssoLoginSchema = z.object({
  domain: z.string().min(1).max(255),
  redirectTo: z.string().url().optional(),
});

export type RoleMapping = z.infer<typeof roleMappingSchema>;
export type SsoConfigInput = z.infer<typeof ssoConfigSchema>;
export type SsoLoginInput = z.infer<typeof ssoLoginSchema>;
