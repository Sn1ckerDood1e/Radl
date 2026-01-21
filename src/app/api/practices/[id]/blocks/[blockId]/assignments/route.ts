import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

// Validation schema for land assignments
const updateAssignmentsSchema = z.object({
  athleteIds: z.array(z.string().uuid()),
});

// GET: Get assignments for a land/erg block
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Verify practice exists and belongs to team
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        teamId: claims.team_id,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block exists and belongs to practice
    const block = await prisma.practiceBlock.findFirst({
      where: {
        id: blockId,
        practiceId,
      },
    });

    if (!block) return notFoundResponse('Block');

    // Get all assignments for this block
    const assignments = await prisma.landAssignment.findMany({
      where: { blockId },
      include: {
        athlete: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/assignments:GET');
  }
}

// PUT: Replace all assignments for a land/erg block (coach only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update assignments');

    // Verify practice exists and belongs to team
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        teamId: claims.team_id,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block exists and belongs to practice
    const block = await prisma.practiceBlock.findFirst({
      where: {
        id: blockId,
        practiceId,
      },
    });

    if (!block) return notFoundResponse('Block');

    // Verify block is LAND or ERG type (not WATER)
    if (block.type === 'WATER') {
      return NextResponse.json(
        { error: 'Use lineup endpoint for water blocks, not assignments' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = updateAssignmentsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { athleteIds } = validationResult.data;

    // Verify all athletes belong to the team
    if (athleteIds.length > 0) {
      const athletes = await prisma.athleteProfile.findMany({
        where: {
          id: { in: athleteIds },
          teamMember: {
            teamId: claims.team_id,
          },
        },
      });

      if (athletes.length !== athleteIds.length) {
        return NextResponse.json(
          { error: 'One or more athletes not found or do not belong to your team' },
          { status: 400 }
        );
      }
    }

    // Use transaction to replace assignments
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing assignments
      await tx.landAssignment.deleteMany({
        where: { blockId },
      });

      // Create new assignments
      if (athleteIds.length > 0) {
        await tx.landAssignment.createMany({
          data: athleteIds.map((athleteId) => ({
            blockId,
            athleteId,
          })),
        });
      }

      // Fetch and return updated assignments
      const assignments = await tx.landAssignment.findMany({
        where: { blockId },
        include: {
          athlete: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      return { count: assignments.length, assignments };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/assignments:PUT');
  }
}
