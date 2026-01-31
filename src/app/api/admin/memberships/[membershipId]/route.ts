import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getUserById } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { updateMembershipSchema } from '@/lib/validations/membership';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ membershipId: string }>;
}

/**
 * PATCH /api/admin/memberships/[membershipId]
 *
 * Update membership roles.
 * Super admin only.
 *
 * Request body: { roles: string[] }
 *
 * Returns:
 * - 200: Roles updated successfully
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Membership not found
 * - 500: Server error
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { membershipId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(membershipId)) {
      return notFoundResponse('Membership');
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parseResult = updateMembershipSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { roles } = parseResult.data;

    // Find existing membership with club info
    const existing = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        club: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return notFoundResponse('Membership');
    }

    // Get user info for audit log
    const user = await getUserById(existing.userId);

    // Update roles
    const updated = await prisma.clubMembership.update({
      where: { id: membershipId },
      data: { roles },
    });

    // Audit log with before/after state
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_ROLE_CHANGED',
      targetType: 'ClubMembership',
      targetId: membershipId,
      beforeState: { roles: existing.roles },
      afterState: { roles },
      metadata: {
        clubId: existing.clubId,
        clubName: existing.club.name,
        userId: existing.userId,
        userEmail: user?.email,
      },
    });

    return NextResponse.json({
      success: true,
      membership: updated,
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/memberships/[membershipId]:PATCH');
  }
}

/**
 * DELETE /api/admin/memberships/[membershipId]
 *
 * Remove user from club (soft delete).
 * Super admin only.
 *
 * Returns:
 * - 200: Membership deactivated successfully
 * - 401: Not authenticated
 * - 404: Membership not found
 * - 500: Server error
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { membershipId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(membershipId)) {
      return notFoundResponse('Membership');
    }

    // Find existing membership with club info
    const existing = await prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: {
        club: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return notFoundResponse('Membership');
    }

    // Get user info for audit log
    const user = await getUserById(existing.userId);

    // Soft delete - set isActive to false
    await prisma.clubMembership.update({
      where: { id: membershipId },
      data: { isActive: false },
    });

    // Audit log with before state
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_MEMBERSHIP_REMOVED',
      targetType: 'ClubMembership',
      targetId: membershipId,
      beforeState: {
        isActive: existing.isActive,
        roles: existing.roles,
        clubId: existing.clubId,
        clubName: existing.club.name,
        userId: existing.userId,
        userEmail: user?.email,
      },
      afterState: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Membership removed',
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/memberships/[membershipId]:DELETE');
  }
}
