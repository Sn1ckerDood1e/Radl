import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateRegattaSchema } from '@/lib/validations/regatta';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get regatta with entries
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { id } = await params;

    const regatta = await prisma.regatta.findFirst({
      where: { id, teamId: claims.team_id },
      include: {
        season: { select: { id: true, name: true } },
        entries: {
          include: {
            entryLineup: {
              include: {
                boat: { select: { id: true, name: true, boatClass: true } },
                seats: {
                  include: {
                    athlete: { select: { id: true, displayName: true } },
                  },
                  orderBy: { position: 'asc' },
                },
              },
            },
            notificationConfig: true,
          },
          orderBy: { scheduledTime: 'asc' },
        },
      },
    });

    if (!regatta) return notFoundResponse('Regatta');

    return NextResponse.json({ regatta });
  } catch (error) {
    return serverErrorResponse(error, 'regattas/[id]:GET');
  }
}

// PATCH: Update regatta
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update regattas');

    const { id } = await params;

    // Verify regatta exists and belongs to team
    const existing = await prisma.regatta.findFirst({
      where: { id, teamId: claims.team_id },
    });

    if (!existing) return notFoundResponse('Regatta');

    const body = await request.json();
    const validationResult = updateRegattaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, location, venue, timezone, startDate, endDate } = validationResult.data;

    const regatta = await prisma.regatta.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(venue !== undefined && { venue }),
        ...(timezone !== undefined && { timezone }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: {
        season: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ regatta });
  } catch (error) {
    return serverErrorResponse(error, 'regattas/[id]:PATCH');
  }
}

// DELETE: Delete regatta (cascades to entries)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete regattas');

    const { id } = await params;

    // Verify regatta exists and belongs to team
    const existing = await prisma.regatta.findFirst({
      where: { id, teamId: claims.team_id },
    });

    if (!existing) return notFoundResponse('Regatta');

    await prisma.regatta.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'regattas/[id]:DELETE');
  }
}
