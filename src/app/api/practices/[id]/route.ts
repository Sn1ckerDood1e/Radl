import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updatePracticeSchema } from '@/lib/validations/practice';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single practice with blocks
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const practice = await prisma.practice.findFirst({
      where: {
        id,
        teamId: claims.team_id,
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!practice) return notFoundResponse('Practice');

    // Athletes can only view PUBLISHED practices
    if (claims.user_role !== 'COACH' && practice.status !== 'PUBLISHED') {
      return notFoundResponse('Practice');
    }

    return NextResponse.json({ practice });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]:GET');
  }
}

// PATCH: Update practice (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update practices');

    const body = await request.json();
    const validationResult = updatePracticeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Build update object
    const updateData: {
      name?: string;
      date?: Date;
      startTime?: Date;
      endTime?: Date;
      notes?: string | null;
      status?: 'DRAFT' | 'PUBLISHED';
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    // Validate time ordering if both times are being updated or if one is updated
    if (updateData.startTime || updateData.endTime) {
      // Fetch existing practice to validate times
      const existing = await prisma.practice.findFirst({
        where: { id, teamId: claims.team_id },
      });
      if (!existing) return notFoundResponse('Practice');

      const effectiveStart = updateData.startTime || existing.startTime;
      const effectiveEnd = updateData.endTime || existing.endTime;

      if (effectiveEnd <= effectiveStart) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    const result = await prisma.practice.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: updateData,
    });

    if (result.count === 0) return notFoundResponse('Practice');

    const practice = await prisma.practice.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ practice });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]:PATCH');
  }
}

// DELETE: Delete practice (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete practices');

    // Delete practice (blocks cascade delete via Prisma schema)
    const result = await prisma.practice.deleteMany({
      where: {
        id,
        teamId: claims.team_id,
      },
    });

    if (result.count === 0) return notFoundResponse('Practice');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]:DELETE');
  }
}
