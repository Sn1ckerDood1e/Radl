import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateSeasonSchema } from '@/lib/validations/season';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single season with eligibility summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const season = await prisma.season.findFirst({
      where: {
        id,
        teamId: claims.team_id,
      },
      include: {
        _count: {
          select: { athleteEligibility: true },
        },
      },
    });

    if (!season) return notFoundResponse('Season');

    return NextResponse.json({ season });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH: Update season (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update seasons');

    const body = await request.json();
    const validationResult = updateSeasonSchema.safeParse(body);

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
      startDate?: Date | null;
      endDate?: Date | null;
      status?: 'ACTIVE' | 'ARCHIVED';
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;

    const result = await prisma.season.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: updateData,
    });

    if (result.count === 0) return notFoundResponse('Season');

    const season = await prisma.season.findUnique({ where: { id } });

    return NextResponse.json({ season });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// DELETE: Delete season (coach only) - soft delete by archiving
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete seasons');

    // Archive instead of hard delete to preserve historical data
    const result = await prisma.season.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: {
        status: 'ARCHIVED',
      },
    });

    if (result.count === 0) return notFoundResponse('Season');

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
