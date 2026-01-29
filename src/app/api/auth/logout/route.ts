import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearCurrentClubId } from '@/lib/auth/club-context';
import { clearCurrentFacilityId } from '@/lib/auth/facility-context';
import { logAuditEvent } from '@/lib/audit/logger';
import { getClientIp } from '@/lib/rate-limit';

/**
 * POST /api/auth/logout
 *
 * Logs out the current user by:
 * 1. Invalidating the Supabase session (clears auth cookies)
 * 2. Clearing the club context cookie
 * 3. Clearing the facility context cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client and get user BEFORE signOut
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const clientIp = getClientIp(request);

    // Sign out
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[logout] signOut error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Failed to sign out' },
        { status: 500 }
      );
    }

    // Log event (fire and forget)
    if (user) {
      logAuditEvent(
        { clubId: 'system', userId: user.id, ipAddress: clientIp },
        { action: 'LOGOUT', targetType: 'Auth' }
      ).catch(console.error);
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
