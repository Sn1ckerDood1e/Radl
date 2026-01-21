import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateAthleteProfileSchema } from '@/lib/validations/athlete';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get a single team member with their athlete profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Find team member by ID (this is the TeamMember.id, not AthleteProfile.id)
    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: {
        athleteProfile: true,
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!teamMember || teamMember.teamId !== claims.team_id) {
      return notFoundResponse('Team member');
    }

    // Check if the current user is viewing their own profile
    const isSelf = teamMember.userId === user.id;

    return NextResponse.json({
      member: {
        id: teamMember.id,
        userId: teamMember.userId,
        role: teamMember.role,
        createdAt: teamMember.createdAt.toISOString(),
        team: teamMember.team,
        profile: teamMember.athleteProfile ? {
          id: teamMember.athleteProfile.id,
          displayName: teamMember.athleteProfile.displayName,
          sidePreference: teamMember.athleteProfile.sidePreference,
          canBow: teamMember.athleteProfile.canBow,
          canCox: teamMember.athleteProfile.canCox,
          phone: teamMember.athleteProfile.phone,
          emergencyName: teamMember.athleteProfile.emergencyName,
          emergencyPhone: teamMember.athleteProfile.emergencyPhone,
          photoUrl: teamMember.athleteProfile.photoUrl,
        } : null,
        isSelf,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'athletes/[id]:GET');
  }
}

// PATCH: Update athlete profile
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Find team member by ID
    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: { athleteProfile: true },
    });

    if (!teamMember || teamMember.teamId !== claims.team_id) {
      return notFoundResponse('Team member');
    }

    // Authorization check:
    // - Athletes can ONLY update their own profile
    // - Coaches can update any profile on their team
    const isCoach = claims.user_role === 'COACH';
    const isSelf = teamMember.userId === user.id;

    if (!isCoach && !isSelf) {
      return forbiddenResponse('You can only edit your own profile');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateAthleteProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // If athlete profile doesn't exist, create it first
    let profile = teamMember.athleteProfile;
    if (!profile) {
      profile = await prisma.athleteProfile.create({
        data: {
          teamMemberId: teamMember.id,
          displayName: updateData.displayName ?? null,
          sidePreference: updateData.sidePreference ?? null,
          canBow: updateData.canBow ?? false,
          canCox: updateData.canCox ?? false,
          phone: updateData.phone ?? null,
          emergencyName: updateData.emergencyName ?? null,
          emergencyPhone: updateData.emergencyPhone ?? null,
        },
      });
    } else {
      // Update existing profile
      profile = await prisma.athleteProfile.update({
        where: { id: profile.id },
        data: {
          ...(updateData.displayName !== undefined && { displayName: updateData.displayName }),
          ...(updateData.sidePreference !== undefined && { sidePreference: updateData.sidePreference }),
          ...(updateData.canBow !== undefined && { canBow: updateData.canBow }),
          ...(updateData.canCox !== undefined && { canCox: updateData.canCox }),
          ...(updateData.phone !== undefined && { phone: updateData.phone }),
          ...(updateData.emergencyName !== undefined && { emergencyName: updateData.emergencyName }),
          ...(updateData.emergencyPhone !== undefined && { emergencyPhone: updateData.emergencyPhone }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        teamMemberId: profile.teamMemberId,
        displayName: profile.displayName,
        sidePreference: profile.sidePreference,
        canBow: profile.canBow,
        canCox: profile.canCox,
        phone: profile.phone,
        emergencyName: profile.emergencyName,
        emergencyPhone: profile.emergencyPhone,
        photoUrl: profile.photoUrl,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'athletes/[id]:PATCH');
  }
}
