import { prisma } from '@/lib/prisma';
import { getCurrentClubId, setCurrentClubId, clearCurrentClubId } from './club-context';
import { getCurrentFacilityId, setCurrentFacilityId, clearCurrentFacilityId } from './facility-context';

export interface ValidatedContext {
  facilityId: string | null;
  clubId: string | null;
  wasRecovered: boolean;  // True if context was auto-corrected
}

interface ValidateOptions {
  /**
   * Whether to update cookies when recovery is needed.
   * Set to false when calling from Server Components (pages/layouts).
   * Set to true when calling from Route Handlers or Server Actions.
   * @default false
   */
  updateCookies?: boolean;
}

/**
 * Validates current context cookies against user's actual memberships.
 * Auto-recovers invalid context by selecting first available membership.
 *
 * Recovery precedence:
 * 1. If clubId cookie invalid -> select first active ClubMembership
 * 2. If facilityId cookie invalid -> detect from validated club
 * 3. If no memberships at all -> return null (caller should redirect to onboarding)
 *
 * @param userId - The user's ID
 * @param options - Options for validation
 * @param options.updateCookies - Whether to update cookies (only works in Route Handlers)
 */
export async function validateAndRecoverContext(
  userId: string,
  options: ValidateOptions = {}
): Promise<ValidatedContext> {
  const { updateCookies = false } = options;

  const currentClubId = await getCurrentClubId();
  const currentFacilityId = await getCurrentFacilityId();

  let validClubId: string | null = null;
  let validFacilityId: string | null = null;
  let wasRecovered = false;

  // Special case: Facility view mode (facilityId set, clubId intentionally cleared)
  // When user is in facility-level view, don't auto-select a club
  if (currentFacilityId && !currentClubId) {
    // Verify user has FACILITY_ADMIN role in this facility
    const facilityMembership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId: currentFacilityId,
        userId,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (facilityMembership) {
      // User is legitimately in facility view mode
      return {
        facilityId: currentFacilityId,
        clubId: null,  // Intentionally null for facility view
        wasRecovered: false,
      };
    }
    // If not a facility admin, fall through to normal recovery
  }

  // Step 1: Validate clubId cookie
  if (currentClubId) {
    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId: currentClubId,
        userId,
        isActive: true,
      },
      include: {
        club: { select: { id: true, facilityId: true } },
      },
    });

    if (membership) {
      // Club is valid
      validClubId = currentClubId;
      validFacilityId = membership.club.facilityId;
    } else {
      // Club is invalid - need recovery
      wasRecovered = true;
      console.warn(`Invalid club cookie ${currentClubId} for user ${userId}, recovering...`);
    }
  }

  // Step 2: If no valid club, find first available
  if (!validClubId) {
    const firstMembership = await prisma.clubMembership.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { joinedAt: 'asc' },
      include: {
        club: { select: { id: true, facilityId: true } },
      },
    });

    if (firstMembership) {
      validClubId = firstMembership.clubId;
      validFacilityId = firstMembership.club.facilityId;
      wasRecovered = true;
    }
  }

  // Step 3: Validate facilityId (if we have one from club lookup)
  if (validFacilityId && currentFacilityId !== validFacilityId) {
    // Facility cookie doesn't match club's facility - update it
    wasRecovered = true;
  }

  // Step 4: Update cookies if recovery happened AND updateCookies is enabled
  // Note: Cookie updates only work in Route Handlers or Server Actions, not in Server Components
  if (wasRecovered && updateCookies) {
    if (validClubId) {
      await setCurrentClubId(validClubId);
    } else {
      await clearCurrentClubId();
    }

    if (validFacilityId) {
      await setCurrentFacilityId(validFacilityId);
    } else {
      await clearCurrentFacilityId();
    }
  }

  return {
    facilityId: validFacilityId,
    clubId: validClubId,
    wasRecovered,
  };
}

/**
 * Restores user's last used context on login.
 * Called after successful authentication.
 *
 * If cookies exist and valid, keep them (user returns to where they left off).
 * If cookies missing, auto-detect from first membership.
 */
export async function restoreLastContext(userId: string): Promise<ValidatedContext> {
  // Just run validation - it handles both "keep valid" and "auto-select" cases
  return validateAndRecoverContext(userId);
}
