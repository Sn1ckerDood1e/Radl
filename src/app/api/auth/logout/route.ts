import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearCurrentClubId } from '@/lib/auth/club-context';
import { clearCurrentFacilityId } from '@/lib/auth/facility-context';

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by:
 * 1. Invalidating the Supabase session (clears auth cookies)
 * 2. Clearing the club context cookie
 * 3. Clearing the facility context cookie
 */
export async function POST() {
  try {
    // Create Supabase client and sign out
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[logout] signOut error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to sign out' },
        { status: 500 }
      );
    }

    // Clear context cookies
    await clearCurrentClubId();
    await clearCurrentFacilityId();

    return NextResponse.json({
      success: true,
      redirect: '/login',
    });
  } catch (error) {
    console.error('[logout] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
