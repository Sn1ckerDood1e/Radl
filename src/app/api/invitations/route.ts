import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInvitationSchema } from '@/lib/validations/invitation';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { getCurrentClubId } from '@/lib/auth/club-context';
import { createAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

// GET: List invitations for current team (coach only)
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view invitations');

    // Get invitations for the team
    const invitations = await prisma.invitation.findMany({
      where: {
        teamId: claims.team_id,
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    return serverErrorResponse(error, 'invitations:GET');
  }
}

// POST: Create single invitation
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create invitations');

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createInvitationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role, athleteId } = validationResult.data;

    // Check if an active invitation already exists for this email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        teamId: claims.team_id,
        email: email.toLowerCase(),
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation already exists for this email' },
        { status: 409 }
      );
    }

    // Create the invitation
    const invitation = await prisma.invitation.create({
      data: {
        teamId: claims.team_id,
        email: email.toLowerCase(),
        role: role,
        status: 'PENDING',
        invitedBy: user.id,
        athleteId: athleteId || null,
      },
    });

    // NOTE: Email sending not implemented in v1 - coaches share join link manually
    // See: .planning/phases/01-foundation-multi-tenancy/01-KNOWN-LIMITATIONS.md
    // TODO(v2): Implement with Resend per limitation doc

    // Audit the invitation
    const clubId = await getCurrentClubId() || claims.team_id;
    const audit = createAuditLogger(request, {
      clubId,
      userId: user.id,
    });

    await audit.log({
      action: 'MEMBER_INVITED',
      targetType: 'Invitation',
      targetId: invitation.id,
      metadata: {
        email: email,
        role: role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          createdAt: invitation.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'invitations:POST');
  }
}
