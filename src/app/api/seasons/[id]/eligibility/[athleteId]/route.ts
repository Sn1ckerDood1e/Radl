import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateEligibilitySchema } from '@/lib/validations/eligibility';

interface RouteParams {
  params: Promise<{ id: string; athleteId: string }>;
}

// GET: Get single athlete's eligibility for a season
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: seasonId, athleteId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });
    if (!season) return notFoundResponse('Season');

    // Authorization: coaches can view any, athletes only their own
    const isCoach = claims.user_role === 'COACH';
    if (!isCoach) {
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: user.id, teamId: claims.team_id },
        include: { athleteProfile: true },
      });

      if (teamMember?.athleteProfile?.id !== athleteId) {
        return forbiddenResponse('You can only view your own eligibility');
      }
    }

    const eligibility = await prisma.athleteEligibility.findUnique({
      where: {
        seasonId_athleteId: { seasonId, athleteId },
      },
      include: {
        athlete: {
          select: { displayName: true },
        },
      },
    });

    if (!eligibility) return notFoundResponse('Eligibility record');

    // Calculate what's missing
    const missing: string[] = [];
    if (!eligibility.waiverSigned) missing.push('Waiver not signed');
    if (!eligibility.swimTestPassed) missing.push('Swim test not passed');
    const customFields = eligibility.customFields as Record<string, boolean>;
    for (const [field, value] of Object.entries(customFields)) {
      if (!value) missing.push(field);
    }

    return NextResponse.json({
      eligibility: {
        id: eligibility.id,
        athleteId: eligibility.athleteId,
        athleteName: eligibility.athlete.displayName,
        isEligible: eligibility.isEligible,
        waiverSigned: eligibility.waiverSigned,
        swimTestPassed: eligibility.swimTestPassed,
        customFields,
        missing,
        updatedAt: eligibility.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH: Update athlete's eligibility (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: seasonId, athleteId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update eligibility');

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });
    if (!season) return notFoundResponse('Season');

    // Verify athlete belongs to team
    const athlete = await prisma.athleteProfile.findFirst({
      where: {
        id: athleteId,
        teamMember: { teamId: claims.team_id },
      },
    });
    if (!athlete) return notFoundResponse('Athlete');

    const body = await request.json();
    const validationResult = updateEligibilitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get existing eligibility to merge customFields
    const existing = await prisma.athleteEligibility.findUnique({
      where: { seasonId_athleteId: { seasonId, athleteId } },
    });

    // Merge customFields if provided
    let mergedCustomFields = (existing?.customFields ?? {}) as Record<string, boolean>;
    if (data.customFields) {
      mergedCustomFields = { ...mergedCustomFields, ...data.customFields };
    }

    // Upsert eligibility record
    const eligibility = await prisma.athleteEligibility.upsert({
      where: {
        seasonId_athleteId: { seasonId, athleteId },
      },
      create: {
        seasonId,
        athleteId,
        isEligible: data.isEligible ?? false,
        waiverSigned: data.waiverSigned ?? false,
        swimTestPassed: data.swimTestPassed ?? false,
        customFields: data.customFields ?? {},
      },
      update: {
        ...(data.isEligible !== undefined && { isEligible: data.isEligible }),
        ...(data.waiverSigned !== undefined && { waiverSigned: data.waiverSigned }),
        ...(data.swimTestPassed !== undefined && { swimTestPassed: data.swimTestPassed }),
        ...(data.customFields !== undefined && { customFields: mergedCustomFields }),
      },
      include: {
        athlete: { select: { displayName: true } },
      },
    });

    return NextResponse.json({
      eligibility: {
        id: eligibility.id,
        athleteId: eligibility.athleteId,
        athleteName: eligibility.athlete.displayName,
        isEligible: eligibility.isEligible,
        waiverSigned: eligibility.waiverSigned,
        swimTestPassed: eligibility.swimTestPassed,
        customFields: eligibility.customFields as Record<string, boolean>,
        updatedAt: eligibility.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
