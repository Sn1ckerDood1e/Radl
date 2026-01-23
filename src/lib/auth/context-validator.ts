import { prisma } from '@/lib/prisma';
import { getCurrentClubId, setCurrentClubId, clearCurrentClubId } from './club-context';
import { getCurrentFacilityId, setCurrentFacilityId, clearCurrentFacilityId } from './facility-context';

export interface ValidatedContext {
  facilityId: string | null;
  clubId: string | null;
  wasRecovered: boolean;  // True if context was auto-corrected
}

/**
 * Validates current context cookies against user's actual memberships.
 * Auto-recovers invalid context by selecting first available membership.
 *
 * Recovery precedence:
 * 1. If clubId cookie invalid -> select first active ClubMembership
 * 2. If facilityId cookie invalid -> detect from validated club
 * 3. If no memberships at all -> return null (caller should redirect to onboarding)
 */
export async function validateAndRecoverContext(userId: string): Promise<ValidatedContext> {
  const currentClubId = await getCurrentClubId();
  const currentFacilityId = await getCurrentFacilityId();

  let validClubId: string | null = null;
  let validFacilityId: string | null = null;
  let wasRecovered = false;

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

  // Step 4: Update cookies if recovery happened
  if (wasRecovered) {
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
