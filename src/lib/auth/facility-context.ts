import { cookies } from 'next/headers';

export const FACILITY_COOKIE_NAME = 'radl_current_facility';
const FACILITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Gets the current facility ID from the httpOnly cookie.
 * Returns null if no facility selected (user needs to select one).
 */
export async function getCurrentFacilityId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(FACILITY_COOKIE_NAME)?.value ?? null;
}

/**
 * Sets the current facility ID in httpOnly cookie.
 * Called when user switches facilities or on initial facility detection.
 */
export async function setCurrentFacilityId(facilityId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(FACILITY_COOKIE_NAME, facilityId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: FACILITY_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clears the current facility cookie.
 * Called on logout or when user is removed from facility.
 */
export async function clearCurrentFacilityId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(FACILITY_COOKIE_NAME);
}

/**
 * Auto-detects facility from user's club membership.
 * Returns facilityId if user has a single facility, null if multiple or none.
 * Used during initial login to auto-set facility context.
 */
export async function detectUserFacility(userId: string): Promise<string | null> {
  // Import here to avoid circular dependency
  const { prisma } = await import('@/lib/prisma');

  // Get unique facilities user belongs to via ClubMembership
  const memberships = await prisma.clubMembership.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      club: {
        select: {
          facilityId: true,
        },
      },
    },
  });

  const facilityIds = [...new Set(
    memberships
      .map(m => m.club.facilityId)
      .filter((id): id is string => id !== null)
  )];

  // If user belongs to exactly one facility, return it
  if (facilityIds.length === 1) {
    return facilityIds[0];
  }

  // Multiple facilities or no facility - user must choose
  return null;
}
