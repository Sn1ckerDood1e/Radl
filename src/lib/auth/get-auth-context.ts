import { NextRequest } from 'next/server';
import { getClaimsForApiRoute } from './claims';
import { defineAbilityFor, createEmptyAbility, type AppAbility, type UserContext } from '@/lib/permissions/ability';
import { prisma } from '@/lib/prisma';

/**
 * Combined auth context for API routes.
 * Includes user, club, roles, and CASL ability.
 */
export interface AuthContext {
  userId: string;
  clubId: string;
  roles: string[];
  ability: AppAbility;
  linkedAthleteIds?: string[];  // For PARENT role
}

/**
 * Result of getAuthContext.
 */
export type AuthContextResult =
  | { success: true; context: AuthContext }
  | { success: false; error: string; status: 401 | 403 };

/**
 * Gets complete auth context for an API route.
 *
 * Handles:
 * 1. Session auth (getClaimsForApiRoute)
 * 2. API key auth (from middleware headers)
 * 3. Club context (from cookie or API key)
 * 4. CASL ability creation
 *
 * @param request - Next.js request (optional, for API key header detection)
 */
export async function getAuthContext(request?: NextRequest): Promise<AuthContextResult> {
  // Check for API key auth (set by middleware)
  if (request) {
    const apiKeyClubId = request.headers.get('x-api-key-club-id');
    const apiKeyUserId = request.headers.get('x-api-key-user-id');

    if (apiKeyClubId && apiKeyUserId) {
      // Get the creator's membership for permissions
      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId: apiKeyClubId,
          userId: apiKeyUserId,
          isActive: true,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: 'API key creator no longer has access to this club',
          status: 403,
        };
      }

      const userContext: UserContext = {
        userId: apiKeyUserId,
        clubId: apiKeyClubId,
        roles: membership.roles as UserContext['roles'],
        viewMode: null,  // API keys don't use facility view mode
      };

      return {
        success: true,
        context: {
          userId: apiKeyUserId,
          clubId: apiKeyClubId,
          roles: membership.roles,
          ability: defineAbilityFor(userContext),
        },
      };
    }
  }

  // Session-based auth
  const { user, clubId, roles, error } = await getClaimsForApiRoute();

  if (error || !user) {
    return { success: false, error: 'Unauthorized', status: 401 };
  }

  if (!clubId) {
    return { success: false, error: 'No club selected', status: 403 };
  }

  // For PARENT role, get linked athlete IDs
  let linkedAthleteIds: string[] | undefined;
  if (roles.includes('PARENT')) {
    // TODO: Query ParentAthleteLink table when it exists
    // For now, parents can see all athletes in their club (to be refined)
    linkedAthleteIds = [];
  }

  const userContext: UserContext = {
    userId: user.id,
    clubId,
    roles: roles as UserContext['roles'],
    linkedAthleteIds,
    viewMode: null,  // Default to null (will be set by facility context in future)
  };

  return {
    success: true,
    context: {
      userId: user.id,
      clubId,
      roles,
      ability: defineAbilityFor(userContext),
      linkedAthleteIds,
    },
  };
}
