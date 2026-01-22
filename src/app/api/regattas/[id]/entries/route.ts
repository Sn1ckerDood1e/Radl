import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { createEntrySchema } from '@/lib/validations/regatta';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: List entries for regatta
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { id: regattaId } = await params;

    // Verify regatta belongs to team
    const regatta = await prisma.regatta.findFirst({
      where: { id: regattaId, teamId: claims.team_id },
    });

    if (!regatta) return notFoundResponse('Regatta');

    const entries = await prisma.entry.findMany({
      where: { regattaId },
      include: {
        entryLineup: {
          include: {
            boat: { select: { id: true, name: true, boatClass: true } },
            _count: { select: { seats: true } },
          },
        },
        notificationConfig: { select: { leadTimeMinutes: true, notificationSent: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    return serverErrorResponse(error, 'regattas/[id]/entries:GET');
  }
}

// POST: Create entry (manual race)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create entries');

    const { id: regattaId } = await params;

    // Verify regatta belongs to team
    const regatta = await prisma.regatta.findFirst({
      where: { id: regattaId, teamId: claims.team_id },
    });

    if (!regatta) return notFoundResponse('Regatta');

    const body = await request.json();
    // Override regattaId from URL params
    const validationResult = createEntrySchema.safeParse({ ...body, regattaId });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { eventName, eventCode, scheduledTime, meetingLocation, meetingTime, notes, heat, lane } = validationResult.data;

    const entry = await prisma.entry.create({
      data: {
        regattaId,
        eventName,
        eventCode: eventCode || null,
        scheduledTime: new Date(scheduledTime),
        meetingLocation: meetingLocation || null,
        meetingTime: meetingTime ? new Date(meetingTime) : null,
        notes: notes || null,
        heat: heat || null,
        lane: lane || null,
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'regattas/[id]/entries:POST');
  }
}
