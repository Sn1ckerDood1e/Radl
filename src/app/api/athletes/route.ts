import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

// GET: List all team members with their athlete profiles (if they have one)
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Get all team members with their athlete profiles
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        teamId: claims.team_id,
      },
      include: {
        athleteProfile: true,
      },
      orderBy: [
        { role: 'asc' }, // COACH, ATHLETE, PARENT order
        { createdAt: 'asc' },
      ],
    });

    // Map to include display info
    const members = teamMembers.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      profile: member.athleteProfile ? {
        id: member.athleteProfile.id,
        displayName: member.athleteProfile.displayName,
        sidePreference: member.athleteProfile.sidePreference,
        canBow: member.athleteProfile.canBow,
        canCox: member.athleteProfile.canCox,
        phone: member.athleteProfile.phone,
        emergencyName: member.athleteProfile.emergencyName,
        emergencyPhone: member.athleteProfile.emergencyPhone,
        photoUrl: member.athleteProfile.photoUrl,
      } : null,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    return serverErrorResponse(error, 'athletes:GET');
  }
}

// POST: Create/ensure athlete profile for a team member
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Parse request body
    const body = await request.json();
    const { teamMemberId, displayName } = body;

    if (!teamMemberId) {
      return NextResponse.json(
        { error: 'teamMemberId is required' },
        { status: 400 }
      );
    }

    // Find the team member
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: { athleteProfile: true },
    });

    if (!teamMember || teamMember.teamId !== claims.team_id) {
      return notFoundResponse('Team member');
    }

    // Authorization check:
    // - Coaches can create profile for any team member
    // - Athletes can only create their own profile
    const isCoach = claims.user_role === 'COACH';
    const isSelf = teamMember.userId === user.id;

    if (!isCoach && !isSelf) {
      return forbiddenResponse('You can only create your own profile');
    }

    // If profile already exists, return it
    if (teamMember.athleteProfile) {
      return NextResponse.json({
        success: true,
        profile: {
          id: teamMember.athleteProfile.id,
          teamMemberId: teamMember.athleteProfile.teamMemberId,
          displayName: teamMember.athleteProfile.displayName,
          sidePreference: teamMember.athleteProfile.sidePreference,
          canBow: teamMember.athleteProfile.canBow,
          canCox: teamMember.athleteProfile.canCox,
          phone: teamMember.athleteProfile.phone,
          emergencyName: teamMember.athleteProfile.emergencyName,
          emergencyPhone: teamMember.athleteProfile.emergencyPhone,
          photoUrl: teamMember.athleteProfile.photoUrl,
        },
        existing: true,
      });
    }

    // Create new profile with defaults
    const profile = await prisma.athleteProfile.create({
      data: {
        teamMemberId: teamMember.id,
        displayName: displayName || null,
        sidePreference: null,
        canBow: false,
        canCox: false,
      },
    });

    return NextResponse.json(
      {
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
        existing: false,
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'athletes:POST');
  }
}
