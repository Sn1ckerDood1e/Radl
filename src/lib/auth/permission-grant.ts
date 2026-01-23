import { prisma } from '@/lib/prisma';
import type { Role } from '@/generated/prisma';
import { grantDurations, type GrantDuration } from '@/lib/validations/permission-grant';

/**
 * Permission grant with user details
 */
export interface PermissionGrantWithDetails {
  id: string;
  clubId: string;
  userId: string;
  grantedBy: string;
  roles: Role[];
  reason: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  notifiedAt: Date | null;
  createdAt: Date;
}

/**
 * Create a new temporary permission grant.
 *
 * @param params - Grant parameters
 * @returns Created grant
 */
export async function createGrant(params: {
  clubId: string;
  userId: string;
  grantedBy: string;
  roles: Role[];
  duration: GrantDuration;
  reason?: string;
}): Promise<PermissionGrantWithDetails> {
  const { clubId, userId, grantedBy, roles, duration, reason } = params;

  const durationConfig = grantDurations[duration];
  const expiresAt = new Date(Date.now() + durationConfig.hours * 60 * 60 * 1000);

  const grant = await prisma.permissionGrant.create({
    data: {
      clubId,
      userId,
      grantedBy,
      roles,
      reason,
      expiresAt,
    },
  });

  return grant as PermissionGrantWithDetails;
}

/**
 * Revoke a permission grant before expiration.
 *
 * @param grantId - Grant ID to revoke
 * @returns Updated grant
 */
export async function revokeGrant(
  grantId: string
): Promise<PermissionGrantWithDetails> {
  const grant = await prisma.permissionGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date() },
  });

  return grant as PermissionGrantWithDetails;
}

/**
 * Get active (non-expired, non-revoked) grants for a user in a club.
 *
 * @param userId - User ID
 * @param clubId - Club ID
 * @returns Active grants
 */
export async function getActiveGrants(
  userId: string,
  clubId: string
): Promise<PermissionGrantWithDetails[]> {
  const grants = await prisma.permissionGrant.findMany({
    where: {
      userId,
      clubId,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
    orderBy: { expiresAt: 'asc' },
  });

  return grants as PermissionGrantWithDetails[];
}

/**
 * Get all grants in a club (for admin listing).
 *
 * @param clubId - Club ID
 * @param includeExpired - Include expired grants
 * @returns Grants list
 */
export async function getClubGrants(
  clubId: string,
  includeExpired = false
): Promise<PermissionGrantWithDetails[]> {
  const where = includeExpired
    ? { clubId }
    : {
        clubId,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      };

  const grants = await prisma.permissionGrant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return grants as PermissionGrantWithDetails[];
}

/**
 * Get user's effective roles including temporary grants.
 * This should be used by the ability builder to include granted roles.
 *
 * @param userId - User ID
 * @param clubId - Club ID
 * @param baseRoles - Roles from ClubMembership
 * @returns Combined roles array
 */
export async function getUserEffectiveRoles(
  userId: string,
  clubId: string,
  baseRoles: Role[]
): Promise<Role[]> {
  const grants = await getActiveGrants(userId, clubId);

  if (grants.length === 0) {
    return baseRoles;
  }

  // Merge granted roles with base roles
  const grantedRoles = grants.flatMap(g => g.roles);
  return [...new Set([...baseRoles, ...grantedRoles])];
}

/**
 * Check if user has a specific role via grant (not base membership).
 *
 * @param userId - User ID
 * @param clubId - Club ID
 * @param role - Role to check
 * @returns True if role is granted via temporary grant
 */
export async function hasGrantedRole(
  userId: string,
  clubId: string,
  role: Role
): Promise<boolean> {
  const grant = await prisma.permissionGrant.findFirst({
    where: {
      userId,
      clubId,
      roles: { has: role },
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
  });

  return grant !== null;
}

/**
 * Get grants that are about to expire (for notification job).
 *
 * @param withinHours - Hours until expiration
 * @returns Grants expiring soon that haven't been notified
 */
export async function getExpiringGrants(
  withinHours: number
): Promise<PermissionGrantWithDetails[]> {
  const now = new Date();
  const threshold = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

  const grants = await prisma.permissionGrant.findMany({
    where: {
      expiresAt: {
        gt: now,
        lte: threshold,
      },
      revokedAt: null,
      notifiedAt: null,
    },
  });

  return grants as PermissionGrantWithDetails[];
}

/**
 * Mark grant as notified (expiration warning sent).
 *
 * @param grantId - Grant ID
 */
export async function markGrantNotified(grantId: string): Promise<void> {
  await prisma.permissionGrant.update({
    where: { id: grantId },
    data: { notifiedAt: new Date() },
  });
}

/**
 * Get expired grants that need to be processed (soft-revoked).
 *
 * @returns Expired grants that haven't been revoked yet
 */
export async function getExpiredGrants(): Promise<PermissionGrantWithDetails[]> {
  const grants = await prisma.permissionGrant.findMany({
    where: {
      expiresAt: { lt: new Date() },
      revokedAt: null,
    },
  });

  return grants as PermissionGrantWithDetails[];
}

/**
 * Bulk soft-revoke expired grants.
 *
 * @param grantIds - Grant IDs to revoke
 * @returns Count of updated grants
 */
export async function bulkRevokeExpiredGrants(
  grantIds: string[]
): Promise<number> {
  const result = await prisma.permissionGrant.updateMany({
    where: { id: { in: grantIds } },
    data: { revokedAt: new Date() },
  });

  return result.count;
}
