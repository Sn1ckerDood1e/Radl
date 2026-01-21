import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { bulkEligibilitySchema } from '@/lib/validations/eligibility';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: List all eligibility records for a season
// Coaches see all, athletes see only their own
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: seasonId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });
    if (!season) return notFoundResponse('Season');

    const isCoach = claims.user_role === 'COACH';

    if (isCoach) {
      // Coaches see all eligibility with athlete details
      const eligibility = await prisma.athleteEligibility.findMany({
        where: { seasonId },
        include: {
          athlete: {
            select: {
              id: true,
              displayName: true,
              teamMember: {
                select: { userId: true },
              },
            },
          },
        },
        orderBy: { athlete: { displayName: 'asc' } },
      });

      return NextResponse.json({
        season: { id: season.id, name: season.name },
        eligibility: eligibility.map(e => ({
          id: e.id,
          athleteId: e.athleteId,
          athleteName: e.athlete.displayName || 'Unknown',
          isEligible: e.isEligible,
          waiverSigned: e.waiverSigned,
          swimTestPassed: e.swimTestPassed,
          customFields: e.customFields as Record<string, boolean>,
          updatedAt: e.updatedAt.toISOString(),
        })),
      });
    } else {
      // Athletes see only their own eligibility
      // First, find the athlete's profile
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: user.id, teamId: claims.team_id },
        include: { athleteProfile: true },
      });

      if (!teamMember?.athleteProfile) {
        return NextResponse.json({
          season: { id: season.id, name: season.name },
          eligibility: null,
          message: 'No athlete profile found',
        });
      }

      const eligibility = await prisma.athleteEligibility.findUnique({
        where: {
          seasonId_athleteId: {
            seasonId,
            athleteId: teamMember.athleteProfile.id,
          },
        },
      });

      if (!eligibility) {
        return NextResponse.json({
          season: { id: season.id, name: season.name },
          eligibility: null,
          message: 'No eligibility record for this season',
        });
      }

      // Calculate what's missing for the athlete
      const missing: string[] = [];
      if (!eligibility.waiverSigned) missing.push('Waiver not signed');
      if (!eligibility.swimTestPassed) missing.push('Swim test not passed');
      const customFields = eligibility.customFields as Record<string, boolean>;
      for (const [field, value] of Object.entries(customFields)) {
        if (!value) missing.push(field);
      }

      return NextResponse.json({
        season: { id: season.id, name: season.name },
        eligibility: {
          id: eligibility.id,
          isEligible: eligibility.isEligible,
          waiverSigned: eligibility.waiverSigned,
          swimTestPassed: eligibility.swimTestPassed,
          customFields,
          missing,
        },
      });
    }
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST: Bulk create eligibility records for athletes (coach only)
// Used when initializing eligibility for a new season
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: seasonId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can manage eligibility');

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });
    if (!season) return notFoundResponse('Season');

    const body = await request.json();
    const validationResult = bulkEligibilitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { athleteIds, defaults } = validationResult.data;

    // Verify all athleteIds are valid AthleteProfile IDs from this team
    const validAthletes = await prisma.athleteProfile.findMany({
      where: {
        id: { in: athleteIds },
        teamMember: { teamId: claims.team_id },
      },
      select: { id: true },
    });

    const validAthleteIds = new Set(validAthletes.map(a => a.id));
    const invalidIds = athleteIds.filter(id => !validAthleteIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some athlete IDs are invalid', invalidIds },
        { status: 400 }
      );
    }

    // Create eligibility records (skip existing)
    const created = await prisma.$transaction(
      athleteIds.map(athleteId =>
        prisma.athleteEligibility.upsert({
          where: {
            seasonId_athleteId: { seasonId, athleteId },
          },
          create: {
            seasonId,
            athleteId,
            isEligible: defaults?.isEligible ?? false,
            waiverSigned: defaults?.waiverSigned ?? false,
            swimTestPassed: defaults?.swimTestPassed ?? false,
            customFields: defaults?.customFields ?? {},
          },
          update: {}, // Don't update existing records
        })
      )
    );

    return NextResponse.json({
      success: true,
      created: created.length,
    }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
