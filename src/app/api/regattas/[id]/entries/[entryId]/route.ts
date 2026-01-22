import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateEntrySchema } from '@/lib/validations/regatta';

interface RouteParams {
  params: Promise<{ id: string; entryId: string }>;
}

// Helper to verify entry belongs to team's regatta
async function verifyEntryAccess(regattaId: string, entryId: string, teamId: string) {
  const entry = await prisma.entry.findFirst({
    where: {
      id: entryId,
      regattaId,
      regatta: { teamId },
    },
    include: {
      regatta: { select: { timezone: true } },
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
  });
  return entry;
}

// GET: Get entry detail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { id: regattaId, entryId } = await params;
    const entry = await verifyEntryAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    return NextResponse.json({ entry });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]:GET');
  }
}

// PATCH: Update entry (time, location, notes, status)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update entries');

    const { id: regattaId, entryId } = await params;
    const existing = await verifyEntryAccess(regattaId, entryId, claims.team_id);

    if (!existing) return notFoundResponse('Entry');

    const body = await request.json();
    const validationResult = updateEntrySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const updateData: Record<string, unknown> = {};

    if (data.eventName !== undefined) updateData.eventName = data.eventName;
    if (data.eventCode !== undefined) updateData.eventCode = data.eventCode;
    if (data.scheduledTime !== undefined) updateData.scheduledTime = new Date(data.scheduledTime);
    if (data.meetingLocation !== undefined) updateData.meetingLocation = data.meetingLocation;
    if (data.meetingTime !== undefined) updateData.meetingTime = data.meetingTime ? new Date(data.meetingTime) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.heat !== undefined) updateData.heat = data.heat;
    if (data.lane !== undefined) updateData.lane = data.lane;
    if (data.placement !== undefined) updateData.placement = data.placement;

    const entry = await prisma.entry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        entryLineup: {
          include: {
            boat: { select: { id: true, name: true } },
            seats: {
              include: { athlete: { select: { id: true, displayName: true } } },
              orderBy: { position: 'asc' },
            },
          },
        },
        notificationConfig: true,
      },
    });

    // If scheduledTime changed and notification exists, update notification schedule
    if (data.scheduledTime !== undefined && existing.notificationConfig) {
      const newNotificationTime = new Date(
        entry.scheduledTime.getTime() - existing.notificationConfig.leadTimeMinutes * 60 * 1000
      );

      await prisma.notificationConfig.update({
        where: { id: existing.notificationConfig.id },
        data: {
          scheduledFor: newNotificationTime,
          notificationSent: false, // Reset if time changed
          sentAt: null,
        },
      });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]:PATCH');
  }
}

// DELETE: Delete entry
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete entries');

    const { id: regattaId, entryId } = await params;
    const existing = await verifyEntryAccess(regattaId, entryId, claims.team_id);

    if (!existing) return notFoundResponse('Entry');

    await prisma.entry.delete({ where: { id: entryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]:DELETE');
  }
}
