import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from '@/lib/errors';
import { createAnnouncementSchema } from '@/lib/validations/announcement';
import { sortAnnouncementsByPriority, buildActiveAnnouncementsQuery } from '@/lib/utils/announcement-helpers';

// GET: List active announcements for current club
export async function GET(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;
    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('practiceId');

    // Build where clause for active announcements
    const where = buildActiveAnnouncementsQuery(
      context.clubId,
      practiceId
    );

    // Query announcements with read receipts for current user
    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        readReceipts: {
          where: { userId: context.userId },
        },
        practice: {
          select: {
            id: true,
            name: true,
            date: true,
            endTime: true,
          },
        },
      },
    });

    // Sort by priority (URGENT → WARNING → INFO)
    const sorted = sortAnnouncementsByPriority(announcements);

    // Map to include isRead boolean
    const mapped = sorted.map((announcement) => ({
      ...announcement,
      isRead: announcement.readReceipts.length > 0,
      readReceipts: undefined, // Remove from output
    }));

    return NextResponse.json({ announcements: mapped });
  } catch (error) {
    return serverErrorResponse(error, 'announcements:GET');
  }
}

// POST: Create new announcement (coaches only)
export async function POST(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission
    if (!context.ability.can('manage', 'Announcement')) {
      return forbiddenResponse('You do not have permission to create announcements');
    }

    const body = await request.json();
    const validationResult = createAnnouncementSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title, body: announcementBody, priority, practiceId, expiresAt } = validationResult.data;

    // If practiceId provided, verify practice belongs to team
    if (practiceId) {
      const practice = await prisma.practice.findFirst({
        where: { id: practiceId, teamId: context.clubId },
      });

      if (!practice) {
        return notFoundResponse('Practice not found or does not belong to your club');
      }
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        teamId: context.clubId,
        createdBy: context.userId,
        title,
        body: announcementBody,
        priority: priority || 'INFO',
        practiceId: practiceId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        practice: {
          select: {
            id: true,
            name: true,
            date: true,
            endTime: true,
          },
        },
      },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'announcements:POST');
  }
}
