import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getUserById } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { addMembershipSchema } from '@/lib/validations/membership';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

/**
 * POST /api/admin/memberships
 *
 * Create a new club membership (add user to club).
 * Super admin only - bypasses invitation flow.
 *
 * Request body: { clubId: string, userId: string, roles?: string[] }
 *
 * Returns:
 * - 201: Membership created successfully
 * - 200: Inactive membership reactivated
 * - 400: Validation error
 * - 401: Not authenticated
 * - 404: Club or user not found
 * - 409: User is already an active member
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
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

    const parseResult = addMembershipSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { clubId, userId, roles } = parseResult.data;

    // Verify club exists (Team model = club in UI)
    const club = await prisma.team.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });
    if (!club) {
      return notFoundResponse('Club');
    }

    // Verify user exists in Supabase Auth
    const user = await getUserById(userId);
    if (!user) {
      return notFoundResponse('User');
    }

    // Check for existing membership
    const existing = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    const audit = createAdminAuditLogger(request, adminContext.userId);

    if (existing) {
      if (existing.isActive) {
        // Already active member - return 409 Conflict
        return NextResponse.json(
          {
            error: 'User is already a member of this club',
            membershipId: existing.id,
            existingRoles: existing.roles,
          },
          { status: 409 }
        );
      }

      // Reactivate inactive membership
      const updated = await prisma.clubMembership.update({
        where: { id: existing.id },
        data: { isActive: true, roles },
      });

      // Audit log with reactivation metadata
      await audit.log({
        action: 'ADMIN_MEMBERSHIP_ADDED',
        targetType: 'ClubMembership',
        targetId: updated.id,
        beforeState: { isActive: false, roles: existing.roles },
        afterState: { isActive: true, roles },
        metadata: {
          reactivated: true,
          clubId,
          clubName: club.name,
          userId,
          userEmail: user.email,
        },
      });

      return NextResponse.json({
        success: true,
        membership: updated,
        reactivated: true,
      });
    }

    // Create new membership
    const membership = await prisma.clubMembership.create({
      data: {
        clubId,
        userId,
        roles,
        isActive: true,
      },
    });

    // Audit log for new membership
    await audit.log({
      action: 'ADMIN_MEMBERSHIP_ADDED',
      targetType: 'ClubMembership',
      targetId: membership.id,
      afterState: {
        clubId,
        clubName: club.name,
        userId,
        userEmail: user.email,
        roles,
      },
    });

    return NextResponse.json(
      { success: true, membership },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'admin/memberships:POST');
  }
}
