import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

// DELETE: Revoke invitation (set status to REVOKED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can revoke invitations');

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) return notFoundResponse('Invitation');

    // Verify the invitation belongs to the coach's team
    if (invitation.teamId !== claims.team_id) return notFoundResponse('Invitation');

    // Revoke the invitation
    await prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'invitations/[id]:DELETE');
  }
}

// PATCH: Approve pending team code join request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can approve join requests');

    const body = await request.json();
    const { action, userId } = body;

    if (action !== 'approve') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) return notFoundResponse('Invitation');

    // Verify the invitation belongs to the coach's team
    if (invitation.teamId !== claims.team_id) return notFoundResponse('Invitation');

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation is not pending' },
        { status: 400 }
      );
    }

    // For team code joins, create the TeamMember and mark invitation as accepted
    await prisma.$transaction(async (tx) => {
      // Create TeamMember
      await tx.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: userId,
          role: invitation.role,
        },
      });

      // Update invitation status
      await tx.invitation.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'invitations/[id]:PATCH');
  }
}
