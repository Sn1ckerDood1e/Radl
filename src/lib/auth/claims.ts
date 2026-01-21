import { createClient } from '@/lib/supabase/server';
import { jwtDecode } from 'jwt-decode';
import { prisma } from '@/lib/prisma';
import type { User } from '@supabase/supabase-js';

/**
 * Custom JWT payload interface for Supabase auth tokens.
 * Single definition used across all API routes and auth helpers.
 */
export interface CustomJwtPayload {
  sub: string;
  email: string;
  team_id: string | null;
  user_role: 'COACH' | 'ATHLETE' | 'PARENT' | null;
}

/**
 * Result type for getClaimsForApiRoute
 */
export type ClaimsResult = {
  user: User | null;
  claims: CustomJwtPayload | null;
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
 * @returns ClaimsResult with user, claims, and error
 */
export async function getClaimsForApiRoute(): Promise<ClaimsResult> {
  const supabase = await createClient();

  // SECURITY: Call getUser() first - validates JWT with Supabase server
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, claims: null, error: 'Unauthorized' };
  }

  // Get session for JWT claims (after getUser validates auth)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { user: null, claims: null, error: 'No session found' };
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

  return { user, claims, error: null };
}
