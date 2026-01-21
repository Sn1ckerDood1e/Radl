import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateBlockTemplateSchema } from '@/lib/validations/template';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single block template
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view block templates');

    const template = await prisma.blockTemplate.findFirst({
      where: {
        id,
        teamId: claims.team_id,
      },
    });

    if (!template) return notFoundResponse('Block template');

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'block-templates/[id]:GET');
  }
}

// PATCH: Update block template (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update block templates');

    const body = await request.json();
    const validationResult = updateBlockTemplateSchema.safeParse(body);

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
      type?: 'WATER' | 'LAND' | 'ERG';
      durationMinutes?: number | null;
      category?: string | null;
      notes?: string | null;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const result = await prisma.blockTemplate.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: updateData,
    });

    if (result.count === 0) return notFoundResponse('Block template');

    const template = await prisma.blockTemplate.findUnique({
      where: { id },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'block-templates/[id]:PATCH');
  }
}

// DELETE: Delete block template (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete block templates');

    const result = await prisma.blockTemplate.deleteMany({
      where: {
        id,
        teamId: claims.team_id,
      },
    });

    if (result.count === 0) return notFoundResponse('Block template');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'block-templates/[id]:DELETE');
  }
}
