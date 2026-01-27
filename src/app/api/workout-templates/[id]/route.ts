import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateWorkoutTemplateSchema } from '@/lib/validations/workout';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single template
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const template = await prisma.workoutTemplate.findFirst({
      where: { id, teamId: claims.team_id },
      include: {
        intervals: { orderBy: { position: 'asc' } },
      },
    });

    if (!template) {
      return notFoundResponse('Template');
    }

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'workout-templates/[id]:GET');
  }
}

// PATCH update template
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update templates');

    // Verify template belongs to team
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id, teamId: claims.team_id },
    });

    if (!existing) {
      return notFoundResponse('Template');
    }

    const body = await request.json();
    const validationResult = updateWorkoutTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Update with optional intervals replacement
    const template = await prisma.$transaction(async (tx) => {
      // If intervals provided, replace all
      if (validated.intervals) {
        await tx.workoutTemplateInterval.deleteMany({
          where: { templateId: id },
        });
      }

      return tx.workoutTemplate.update({
        where: { id },
        data: {
          name: validated.name,
          type: validated.type,
          notes: validated.notes,
          ...(validated.intervals && {
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
          }),
        },
        include: {
          intervals: { orderBy: { position: 'asc' } },
        },
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'workout-templates/[id]:PATCH');
  }
}

// DELETE template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete templates');

    // Verify template belongs to team
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id, teamId: claims.team_id },
    });

    if (!existing) {
      return notFoundResponse('Template');
    }

    await prisma.workoutTemplate.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'workout-templates/[id]:DELETE');
  }
}
