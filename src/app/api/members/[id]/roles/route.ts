import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { createAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

const updateRolesSchema = z.object({
  roles: z.array(z.enum(['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'])).min(1),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/members/[id]/roles
 * Update a member's roles. Audited operation.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: membershipId } = await params;

    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission
    if (!context.ability.can('assign-role', 'ClubMembership')) {
      return forbiddenResponse('You do not have permission to assign roles');
    }

    const body = await request.json();
    const validationResult = updateRolesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { roles } = validationResult.data;

    // Get current membership
    const membership = await prisma.clubMembership.findFirst({
      where: {
        id: membershipId,
        clubId: context.clubId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Prevent self-demotion from admin roles
    if (membership.userId === context.userId) {
      const wasAdmin = membership.roles.some(r =>
        ['FACILITY_ADMIN', 'CLUB_ADMIN'].includes(r)
      );
      const stillAdmin = roles.some(r =>
        ['FACILITY_ADMIN', 'CLUB_ADMIN'].includes(r)
      );

      if (wasAdmin && !stillAdmin) {
        return NextResponse.json(
          { error: 'Cannot remove your own admin role' },
          { status: 400 }
        );
      }
    }

    // Update roles
    const updated = await prisma.clubMembership.update({
      where: { id: membershipId },
      data: { roles },
    });

    // Audit the role change
    const audit = createAuditLogger(request, {
      clubId: context.clubId,
      userId: context.userId,
    });

    await audit.log({
      action: 'ROLE_CHANGED',
      targetType: 'ClubMembership',
      targetId: membershipId,
      metadata: {
        targetUserId: membership.userId,
        oldRoles: membership.roles,
        newRoles: roles,
      },
    });

    return NextResponse.json({ membership: updated });
  } catch (error) {
    return serverErrorResponse(error, 'members/roles:PATCH');
  }
}
