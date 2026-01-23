import { prisma } from '@/lib/prisma';
import type { Role, SsoConfig } from '@/generated/prisma';
import type { RoleMapping, SsoConfigInput } from '@/lib/validations/sso';

/**
 * SSO configuration with typed role mappings
 */
export interface SsoConfigWithMappings extends Omit<SsoConfig, 'roleMappings'> {
  roleMappings: RoleMapping[];
}

/**
 * Get SSO configuration for a facility.
 * Returns null if no configuration exists.
 */
export async function getSsoConfig(
  facilityId: string
): Promise<SsoConfigWithMappings | null> {
  const config = await prisma.ssoConfig.findUnique({
    where: { facilityId },
  });

  if (!config) return null;

  return {
    ...config,
    roleMappings: (config.roleMappings as RoleMapping[]) || [],
  };
}

/**
 * Create or update SSO configuration for a facility.
 */
export async function updateSsoConfig(
  facilityId: string,
  input: SsoConfigInput
): Promise<SsoConfigWithMappings> {
  const config = await prisma.ssoConfig.upsert({
    where: { facilityId },
    create: {
      facilityId,
      enabled: input.enabled ?? false,
      ssoProviderId: input.ssoProviderId ?? null,
      idpDomain: input.idpDomain ?? null,
      idpGroupClaim: input.idpGroupClaim ?? 'groups',
      roleMappings: (input.roleMappings as object[]) ?? [],
      defaultRole: input.defaultRole ?? 'ATHLETE',
      allowOverride: input.allowOverride ?? true,
    },
    update: {
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      ...(input.ssoProviderId !== undefined && { ssoProviderId: input.ssoProviderId }),
      ...(input.idpDomain !== undefined && { idpDomain: input.idpDomain }),
      ...(input.idpGroupClaim !== undefined && { idpGroupClaim: input.idpGroupClaim }),
      ...(input.roleMappings !== undefined && { roleMappings: input.roleMappings as object[] }),
      ...(input.defaultRole !== undefined && { defaultRole: input.defaultRole }),
      ...(input.allowOverride !== undefined && { allowOverride: input.allowOverride }),
    },
  });

  return {
    ...config,
    roleMappings: (config.roleMappings as RoleMapping[]) || [],
  };
}

/**
 * Map SSO/IDP claims to RowOps roles.
 *
 * Per CONTEXT.md:
 * - Configurable mapping from IDP groups/claims to RowOps roles
 * - Default to ATHLETE if no mapping matches
 * - Role updates on next login
 *
 * @param facilityId - Facility the user is logging into
 * @param idpClaims - Claims from identity provider
 * @returns Array of mapped RowOps roles
 */
export async function mapSsoRoles(
  facilityId: string,
  idpClaims: Record<string, unknown>
): Promise<Role[]> {
  const config = await getSsoConfig(facilityId);

  if (!config || !config.enabled) {
    return [config?.defaultRole ?? 'ATHLETE'];
  }

  // Get groups/roles from the configured claim
  const claimValue = idpClaims[config.idpGroupClaim];
  const groups: string[] = Array.isArray(claimValue)
    ? claimValue.map(String)
    : typeof claimValue === 'string'
      ? [claimValue]
      : [];

  // Find matching role mappings
  const mappedRoles: Role[] = [];

  for (const mapping of config.roleMappings) {
    if (groups.includes(mapping.idpValue)) {
      mappedRoles.push(...(mapping.rowopsRoles as Role[]));
    }
  }

  // Return mapped roles or default
  if (mappedRoles.length > 0) {
    return [...new Set(mappedRoles)]; // Deduplicate
  }

  return [config.defaultRole];
}

/**
 * Check if SSO is enabled and configured for a facility.
 */
export async function isSsoEnabled(facilityId: string): Promise<boolean> {
  const config = await prisma.ssoConfig.findUnique({
    where: { facilityId },
    select: { enabled: true, ssoProviderId: true },
  });

  return config?.enabled === true && config.ssoProviderId !== null;
}

/**
 * Get the IDP domain for a facility (for SSO login routing).
 */
export async function getSsoDomain(facilityId: string): Promise<string | null> {
  const config = await prisma.ssoConfig.findUnique({
    where: { facilityId },
    select: { idpDomain: true, enabled: true },
  });

  if (!config?.enabled) return null;
  return config.idpDomain;
}

/**
 * Check if facility admin override is allowed for SSO users.
 * Per CONTEXT.md: "Facility admin can override SSO-derived roles"
 */
export async function canOverrideSsoRoles(facilityId: string): Promise<boolean> {
  const config = await prisma.ssoConfig.findUnique({
    where: { facilityId },
    select: { allowOverride: true },
  });

  return config?.allowOverride ?? true;
}
