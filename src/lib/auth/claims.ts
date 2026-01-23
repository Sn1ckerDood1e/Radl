import { createClient } from '@/lib/supabase/server';
import { jwtDecode } from 'jwt-decode';
import { prisma } from '@/lib/prisma';
import type { User } from '@supabase/supabase-js';
import { getCurrentClubId } from './club-context';
import { getCurrentFacilityId } from './facility-context';
import { getUserEffectiveRoles } from './permission-grant';
import type { Role } from '@/generated/prisma';

/**
 * Custom JWT payload interface for Supabase auth tokens.
 * Single definition used across all API routes and auth helpers.
 */
export interface CustomJwtPayload {
  sub: string;
  email: string;
  // Facility hierarchy
  facility_id: string | null;
  club_id?: string | null;     // Current club from cookie
  // Legacy - kept for backward compatibility
  team_id: string | null;
  user_role: 'COACH' | 'ATHLETE' | 'PARENT' | null;  // Legacy single role
  user_roles?: string[];       // All roles in current club
}

/**
 * Result type for getClaimsForApiRoute
 */
export type ClaimsResult = {
  user: User | null;
  claims: CustomJwtPayload | null;
  facilityId: string | null;   // Current facility from cookie or JWT
  clubId: string | null;       // Current club from cookie
  roles: string[];             // Roles in current club
  viewMode: 'facility' | 'club' | null;  // Derived from cookie state
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
 * Facility context: Reads current facility from httpOnly cookie, with fallback to
 * team's facilityId via database lookup, then JWT claims.
 *
 * Club context: Reads current club from httpOnly cookie and fetches user's roles
 * in that club from ClubMembership. Falls back to legacy team_id/user_role for
 * backward compatibility.
 *
 * ViewMode derivation: Computes from cookie state:
 * - 'facility': facilityId set, no clubId (facility-level view)
 * - 'club': both facilityId and clubId set, or clubId only (club view)
 * - null: no facility context (legacy team-only mode)
 *
 * @returns ClaimsResult with user, claims, facilityId, clubId, roles, viewMode, and error
 */
export async function getClaimsForApiRoute(): Promise<ClaimsResult> {
  const supabase = await createClient();

  // SECURITY: Call getUser() first - validates JWT with Supabase server
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, claims: null, facilityId: null, clubId: null, roles: [], viewMode: null, error: 'Unauthorized' };
  }

  // Get session for JWT claims (after getUser validates auth)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { user: null, claims: null, facilityId: null, clubId: null, roles: [], viewMode: null, error: 'No session found' };
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

  // Get current facility from cookie
  let facilityId = await getCurrentFacilityId();

  // Database fallback: If facilityId is null but clubId exists, look up team's facility
  if (!facilityId && clubId) {
    const team = await prisma.team.findUnique({
      where: { id: clubId },
      select: { facilityId: true },
    });
    if (team?.facilityId) {
      facilityId = team.facilityId;
    }
  }

  // Also check JWT claims as fallback
  if (!facilityId && claims.facility_id) {
    facilityId = claims.facility_id;
  }

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
      // Get effective roles including any temporary grants
      const effectiveRoles = await getUserEffectiveRoles(
        user.id,
        clubId,
        membership.roles as Role[]
      );
      roles = effectiveRoles.map(r => r.toString());
    }
  }

  // If no club selected but user has legacy TeamMember, use that
  if (!clubId && claims.team_id) {
    // Backward compatibility with TeamMember
    if (claims.user_role) {
      roles = [claims.user_role];
    }
  }

  // Derive viewMode from cookie state
  let viewMode: 'facility' | 'club' | null = null;

  if (facilityId && !clubId) {
    // Facility cookie set but no club - facility-level view
    viewMode = 'facility';
  } else if (facilityId && clubId) {
    // Both set - club view within facility
    viewMode = 'club';
  } else if (clubId) {
    // Only club set (legacy path) - treat as club view
    viewMode = 'club';
  }
  // null viewMode = no facility context (legacy team-only)

  return {
    user,
    claims,
    facilityId,  // From cookie, team lookup, or JWT claims
    clubId: clubId || claims.team_id,  // Fall back to legacy team_id
    roles,
    viewMode,
    error: null,
  };
}
