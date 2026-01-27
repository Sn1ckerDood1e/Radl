import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { createWorkoutSchema } from '@/lib/validations/workout';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

// GET workout for block
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const workout = await prisma.workout.findUnique({
      where: { blockId },
      include: {
        intervals: { orderBy: { position: 'asc' } },
      },
    });

    if (!workout) {
      return NextResponse.json({ workout: null });
    }

    return NextResponse.json({ workout });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/workout:GET');
  }
}

// PUT (create or update) workout for block
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update workouts');

    // Verify practice belongs to team
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block belongs to practice and is ERG or WATER type
    const block = await prisma.practiceBlock.findUnique({
      where: { id: blockId },
      select: { practiceId: true, type: true },
    });

    if (!block || block.practiceId !== practiceId) {
      return notFoundResponse('Block');
    }

    if (block.type !== 'ERG' && block.type !== 'WATER') {
      return NextResponse.json(
        { error: 'Workouts only supported for ERG and WATER blocks' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = createWorkoutSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Upsert workout (create or update)
    const workout = await prisma.$transaction(async (tx) => {
      // Delete existing workout and intervals if exists
      await tx.workout.deleteMany({ where: { blockId } });

      // Create new workout with intervals
      return tx.workout.create({
        data: {
          blockId,
          type: validated.type,
          notes: validated.notes,
          visibleToAthletes: validated.visibleToAthletes,
          intervals: {
            create: validated.intervals.map((interval, index) => ({
              position: index,
              durationType: interval.durationType,
              duration: interval.duration,
              targetSplit: interval.targetSplit,
              targetStrokeRate: interval.targetStrokeRate,
              restDuration: interval.restDuration,
              restType: interval.restType,
            })),
          },
        },
        include: {
          intervals: { orderBy: { position: 'asc' } },
        },
      });
    });

    return NextResponse.json({ workout });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/workout:PUT');
  }
}

// DELETE workout from block
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete workouts');

    // Verify practice belongs to team
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block belongs to practice
    const block = await prisma.practiceBlock.findUnique({
      where: { id: blockId },
      select: { practiceId: true },
    });

    if (!block || block.practiceId !== practiceId) {
      return notFoundResponse('Block');
    }

    await prisma.workout.deleteMany({ where: { blockId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/workout:DELETE');
  }
}
