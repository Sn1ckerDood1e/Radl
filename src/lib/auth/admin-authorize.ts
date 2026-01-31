import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { requireAuth, getAuthUser } from './authorize';
import { prisma } from '@/lib/prisma';

/**
 * Admin context returned for API routes.
 */
export interface AdminContext {
  userId: string;
  isSuperAdmin: true;
}

/**
 * Check if a user is a super admin by querying the database.
 *
 * SECURITY: This function ALWAYS queries the SuperAdmin table directly.
 * It does not trust JWT claims for super admin status. The database is
 * the source of truth for platform-level permissions.
 *
 * This ensures:
 * - Immediate revocation of super admin access
 * - No stale JWT claims granting unauthorized access
 * - Audit trail integrity (database state matches access)
 *
 * @param userId - The user ID to check
 * @returns true if user is a super admin, false otherwise
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { userId },
    select: { userId: true },
  });

  return superAdmin !== null;
}

/**
 * Require super admin authentication for server components.
 *
 * SECURITY: Database-verified super admin status.
 * - First validates user is authenticated via Supabase
 * - Then queries SuperAdmin table to verify platform-level access
 * - Silent redirect to '/' for non-admins (no error message)
 *
 * The silent redirect prevents information disclosure about admin routes.
 *
 * @returns The authenticated super admin user
 * @throws Redirects to /login if not authenticated
 * @throws Redirects to / if not a super admin
 */
export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth();

  const isAdmin = await isSuperAdmin(user.id);
  if (!isAdmin) {
    // Silent redirect - do not reveal admin panel exists
    redirect('/');
  }

  return user;
}

/**
 * Get super admin context for API routes.
 *
 * SECURITY: Database-verified super admin status.
 * Unlike requireSuperAdmin, this does NOT redirect.
 * Returns null for unauthorized access, allowing API routes
 * to return appropriate HTTP status codes.
 *
 * @returns AdminContext if user is super admin, null otherwise
 */
export async function getSuperAdminContext(): Promise<AdminContext | null> {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }

  const isAdmin = await isSuperAdmin(user.id);
  if (!isAdmin) {
    return null;
  }

  return {
    userId: user.id,
    isSuperAdmin: true,
  };
}
