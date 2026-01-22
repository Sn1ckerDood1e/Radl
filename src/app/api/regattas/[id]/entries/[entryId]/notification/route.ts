import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { notificationConfigSchema, updateNotificationConfigSchema } from '@/lib/validations/regatta';

interface RouteParams {
  params: Promise<{ id: string; entryId: string }>;
}

// Helper to verify entry access
async function getEntryWithAccess(regattaId: string, entryId: string, teamId: string) {
  return prisma.entry.findFirst({
    where: {
      id: entryId,
      regattaId,
      regatta: { teamId },
    },
    include: {
      regatta: { select: { id: true, name: true } },
    },
  });
}

// Calculate notification time from race time and lead time
function calculateNotificationTime(scheduledTime: Date, leadTimeMinutes: number): Date {
  return new Date(scheduledTime.getTime() - leadTimeMinutes * 60 * 1000);
}

// GET: Get notification config for entry
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    const config = await prisma.notificationConfig.findUnique({
      where: { entryId },
    });

    return NextResponse.json({ config });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/notification:GET');
  }
}

// PUT: Create or update notification config
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can configure notifications');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    const body = await request.json();
    const validationResult = notificationConfigSchema.safeParse({ ...body, entryId });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { leadTimeMinutes } = validationResult.data;

    // Get the entry's scheduled time
    const entryData = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { scheduledTime: true },
    });

    if (!entryData) return notFoundResponse('Entry');

    const scheduledFor = calculateNotificationTime(entryData.scheduledTime, leadTimeMinutes);

    // Check if notification time is in the past
    const isPast = scheduledFor < new Date();

    // Upsert notification config
    const config = await prisma.notificationConfig.upsert({
      where: { entryId },
      create: {
        entryId,
        leadTimeMinutes,
        scheduledFor: isPast ? null : scheduledFor,
        notificationSent: isPast, // Mark as sent if past (won't be processed)
      },
      update: {
        leadTimeMinutes,
        scheduledFor: isPast ? null : scheduledFor,
        notificationSent: isPast,
        sentAt: null, // Reset sentAt on config change
      },
    });

    return NextResponse.json({
      config,
      warning: isPast ? 'Notification time is in the past and will not be sent' : null,
    });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/notification:PUT');
  }
}

// PATCH: Update notification lead time
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can configure notifications');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    // Check if config exists
    const existing = await prisma.notificationConfig.findUnique({
      where: { entryId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not configured for this entry' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = updateNotificationConfigSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { leadTimeMinutes } = validationResult.data;

    if (leadTimeMinutes === undefined) {
      return NextResponse.json({ config: existing });
    }

    // Get entry scheduled time
    const entryData = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { scheduledTime: true },
    });

    if (!entryData) return notFoundResponse('Entry');

    const scheduledFor = calculateNotificationTime(entryData.scheduledTime, leadTimeMinutes);
    const isPast = scheduledFor < new Date();

    const config = await prisma.notificationConfig.update({
      where: { entryId },
      data: {
        leadTimeMinutes,
        scheduledFor: isPast ? null : scheduledFor,
        notificationSent: isPast || existing.notificationSent,
        sentAt: null,
      },
    });

    return NextResponse.json({
      config,
      warning: isPast ? 'Notification time is in the past and will not be sent' : null,
    });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/notification:PATCH');
  }
}

// DELETE: Remove notification config
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can configure notifications');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    await prisma.notificationConfig.deleteMany({
      where: { entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/notification:DELETE');
  }
}
