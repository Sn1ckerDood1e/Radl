import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getSupabaseAdmin, getUserById } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST /api/admin/users/[userId]/reset-password
 *
 * Send a password reset email to a user (USER-08).
 * Uses Supabase admin API to generate and send recovery link.
 *
 * Response: 200 with { success: true, message: 'Password reset email sent' }
 *
 * Errors:
 * - 400: User is deactivated (cannot reset password for banned user)
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

    // Get user to verify existence and get email
    const user = await getUserById(userId);
    if (!user) {
      return notFoundResponse('User');
    }

    // Check if user is deactivated (banned)
    if (user.banned_until) {
      return NextResponse.json(
        { error: 'Cannot reset password for a deactivated user. Reactivate the user first.' },
        { status: 400 }
      );
    }

    // Verify user has an email
    if (!user.email) {
      return NextResponse.json(
        { error: 'User does not have an email address' },
        { status: 400 }
      );
    }

    // Generate and send password recovery link via Supabase
    // Using generateLink with recovery type to get the link, then Supabase sends the email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${appUrl}/reset-password`;

    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo,
      },
    });

    if (resetError) {
      console.error('[admin/users/reset-password:POST] Failed to generate reset link:', resetError);

      // Try alternative method if generateLink fails
      // Some Supabase versions may not support generateLink well
      const { error: altError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      });

      if (altError) {
        console.error('[admin/users/reset-password:POST] Alternative method also failed:', altError);
        return serverErrorResponse(resetError, 'admin/users/reset-password:POST');
      }
    }

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_PASSWORD_RESET',
      targetType: 'User',
      targetId: userId,
      metadata: {
        email: user.email,
        initiatedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent',
      email: user.email,
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/users/reset-password:POST');
  }
}
