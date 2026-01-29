import { cookies } from 'next/headers';

export const CLUB_COOKIE_NAME = 'radl_current_club';
const CLUB_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Gets the current club ID from the httpOnly cookie.
 * Returns null if no club selected (user needs to select one).
 */
export async function getCurrentClubId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CLUB_COOKIE_NAME)?.value ?? null;
}

/**
 * Sets the current club ID in httpOnly cookie.
 * Called after switch API verifies membership.
 */
export async function setCurrentClubId(clubId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CLUB_COOKIE_NAME, clubId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLUB_COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clears the current club cookie.
 * Called on logout or when user is removed from club.
 */
export async function clearCurrentClubId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CLUB_COOKIE_NAME);
}
