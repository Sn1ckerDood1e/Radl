import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createWorkoutTemplateSchema } from '@/lib/validations/workout';

// GET list of workout templates for team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const templates = await prisma.workoutTemplate.findMany({
      where: { teamId: claims.team_id },
      include: {
        intervals: { orderBy: { position: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return serverErrorResponse(error, 'workout-templates:GET');
  }
}

// POST create new workout template
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create templates');

    const body = await request.json();
    const validationResult = createWorkoutTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    const template = await prisma.workoutTemplate.create({
      data: {
        teamId: claims.team_id,
        name: validated.name,
        type: validated.type,
        notes: validated.notes,
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

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'workout-templates:POST');
  }
}
