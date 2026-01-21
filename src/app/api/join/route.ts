import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Schema for email invite acceptance
const emailInviteSchema = z.object({
  invitationId: z.string().uuid(),
});

// Schema for team code join
const teamCodeSchema = z.object({
  teamCode: z.string().length(8),
  role: z.enum(['ATHLETE', 'PARENT']).default('ATHLETE'),
});

// POST: Accept invitation (email invite or team code)
export async function POST(request: NextRequest) {
  // Rate limit check FIRST - before any database operations
  // This prevents brute-force attacks on join codes even without valid auth
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(clientIp, 'join');

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many join attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in or create an account first.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Determine which type of join this is
    if (body.invitationId) {
      // Email invite acceptance
      return handleEmailInvite(body, user);
    } else if (body.teamCode) {
      // Team code join
      return handleTeamCodeJoin(body, user);
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide invitationId or teamCode.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing join request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleEmailInvite(body: unknown, user: { id: string; email?: string }) {
  const validationResult = emailInviteSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid invitation ID', details: validationResult.error.flatten() },
      { status: 400 }
    );
  }

  const { invitationId } = validationResult.data;

  // Find the invitation
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { team: true },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: 'Invitation not found' },
      { status: 404 }
    );
  }

  if (invitation.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'This invitation is no longer valid' },
      { status: 400 }
    );
  }

  // Verify email matches (email invites must match the invited email)
  if (invitation.email && user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address' },
      { status: 403 }
    );
  }

  // Check if user is already a member of this team
  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: invitation.teamId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: 'You are already a member of this team' },
      { status: 400 }
    );
  }

  // Email invites auto-approve: create TeamMember and update invitation
  await prisma.$transaction(async (tx) => {
    // Create TeamMember
    await tx.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: user.id,
        role: invitation.role,
      },
    });

    // Update invitation status
    await tx.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: 'You have joined the team!',
    team: {
      id: invitation.team.id,
      name: invitation.team.name,
      slug: invitation.team.slug,
    },
    requiresApproval: false,
  });
}

async function handleTeamCodeJoin(body: unknown, user: { id: string; email?: string }) {
  const validationResult = teamCodeSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid team code', details: validationResult.error.flatten() },
      { status: 400 }
    );
  }

  const { teamCode, role } = validationResult.data;

  // Find team by join code
  const team = await prisma.team.findUnique({
    where: { joinCode: teamCode.toUpperCase() },
  });

  if (!team) {
    return NextResponse.json(
      { error: 'Invalid team code' },
      { status: 404 }
    );
  }

  // Check if user is already a member of this team
  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: 'You are already a member of this team' },
      { status: 400 }
    );
  }

  // Check if user already has a pending join request
  const existingRequest = await prisma.invitation.findFirst({
    where: {
      teamId: team.id,
      email: user.email?.toLowerCase() || null,
      status: 'PENDING',
    },
  });

  if (existingRequest) {
    return NextResponse.json(
      { error: 'You already have a pending join request for this team' },
      { status: 400 }
    );
  }

  // Get a coach's userId to use as invitedBy (the team creator will be the coach)
  const coach = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      role: 'COACH',
    },
    orderBy: {
      createdAt: 'asc', // Get the earliest coach (team creator)
    },
  });

  // Team code joins require coach approval: create pending invitation
  const invitation = await prisma.invitation.create({
    data: {
      teamId: team.id,
      email: user.email?.toLowerCase() || null,
      userId: user.id, // Track which user is requesting to join
      role: role,
      status: 'PENDING',
      invitedBy: coach?.userId || user.id, // Use coach if found, else self (shouldn't happen)
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Your request to join has been submitted. A coach will review it shortly.',
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
    },
    requiresApproval: true,
    invitationId: invitation.id,
  });
}
