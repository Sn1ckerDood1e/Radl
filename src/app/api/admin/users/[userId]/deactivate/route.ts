import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getSupabaseAdmin, getUserById } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST /api/admin/users/[userId]/deactivate
 *
 * Deactivate a user account, blocking their ability to log in (USER-06).
 * Uses Supabase ban_duration with 100-year effective permanent ban.
 *
 * Response: 200 with { success: true, user: {...} }
 *
 * Errors:
 * - 400: User already deactivated
 * - 401: Not authenticated or not super admin
 * - 404: User not found
 * - 500: Supabase API error
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { userId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return notFoundResponse('User');
    }

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Admin operations not available' },
        { status: 500 }
      );
    }

    // Get current user state
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return notFoundResponse('User');
    }

    // Check if user is already deactivated (banned)
    if (existingUser.banned_until) {
      return NextResponse.json(
        { error: 'User is already deactivated' },
        { status: 400 }
      );
    }

    // Deactivate user with 100-year ban (effectively permanent but reversible)
    // 876000 hours = 100 years
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: '876000h',
    });

    if (updateError) {
      console.error('[admin/users/deactivate:POST] Failed to deactivate user:', updateError);
      return serverErrorResponse(updateError, 'admin/users/deactivate:POST');
    }

    const updatedUser = data.user;

    // Log admin action with before/after state
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_USER_DEACTIVATED',
      targetType: 'User',
      targetId: userId,
      beforeState: {
        email: existingUser.email,
        isDeactivated: false,
      },
      afterState: {
        email: updatedUser.email,
        isDeactivated: true,
        bannedUntil: updatedUser.banned_until,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isDeactivated: true,
        bannedUntil: updatedUser.banned_until,
        deactivatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/users/deactivate:POST');
  }
}
