import { createClient } from '@/lib/supabase/server';
import { jwtDecode } from 'jwt-decode';
import { prisma } from '@/lib/prisma';
import type { User } from '@supabase/supabase-js';
import { getCurrentClubId } from './club-context';

/**
 * Custom JWT payload interface for Supabase auth tokens.
 * Single definition used across all API routes and auth helpers.
 */
export interface CustomJwtPayload {
  sub: string;
  email: string;
  team_id: string | null;      // Legacy - kept for backward compatibility
  club_id?: string | null;     // New - current club from cookie
  user_role: 'COACH' | 'ATHLETE' | 'PARENT' | null;  // Legacy single role
  user_roles?: string[];       // New - all roles in current club
}

/**
 * Result type for getClaimsForApiRoute
 */
export type ClaimsResult = {
  user: User | null;
  claims: CustomJwtPayload | null;
  clubId: string | null;       // Current club from cookie
  roles: string[];             // Roles in current club
  error: string | null;
};

/**
 * Centralized claims helper for API routes.
 *
 * SECURITY: Uses getUser() FIRST to verify JWT authenticity with Supabase server,
 * then getSession() to extract claims. This is the secure pattern - getSession()
 * alone does not validate the JWT.
 *
 * Includes database fallback for team_id when JWT claims are stale (e.g., user
 * just joined a team but JWT not yet refreshed).
 *
 * Club context: Reads current club from httpOnly cookie and fetches user's roles
 * in that club from ClubMembership. Falls back to legacy team_id/user_role for
 * backward compatibility.
 *
 * @returns ClaimsResult with user, claims, clubId, roles, and error
 */
export async function getClaimsForApiRoute(): Promise<ClaimsResult> {
  const supabase = await createClient();

  // SECURITY: Call getUser() first - validates JWT with Supabase server
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, claims: null, clubId: null, roles: [], error: 'Unauthorized' };
  }

  // Get session for JWT claims (after getUser validates auth)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { user: null, claims: null, clubId: null, roles: [], error: 'No session found' };
  }

  // Decode JWT to extract custom claims
  let claims = jwtDecode<CustomJwtPayload>(session.access_token);

  // Database fallback: If team_id is null in JWT, check database directly
  // This handles the case where user just joined team but JWT not refreshed
  if (!claims.team_id) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
    });

    if (teamMember) {
      claims = {
        ...claims,
        team_id: teamMember.teamId,
        user_role: teamMember.role as CustomJwtPayload['user_role'],
      };
    }
  }

  // Get current club from cookie
  const clubId = await getCurrentClubId();
  let roles: string[] = [];

  if (clubId) {
    // Get user's roles in current club
    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        isActive: true,
      },
    });

    if (membership) {
      roles = membership.roles;
    }
  }

  // If no club selected but user has legacy TeamMember, use that
  if (!clubId && claims.team_id) {
    // Backward compatibility with TeamMember
    if (claims.user_role) {
      roles = [claims.user_role];
    }
  }

  return {
    user,
    claims,
    clubId: clubId || claims.team_id,  // Fall back to legacy team_id
    roles,
    error: null,
  };
}
