import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from '@/lib/errors';
import { updateAnnouncementSchema } from '@/lib/validations/announcement';

// PATCH: Update announcement (coaches only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context: authContext } = result;

    // Check permission
    if (!authContext.ability.can('manage', 'Announcement')) {
      return forbiddenResponse('You do not have permission to update announcements');
    }

    const { id } = await context.params;

    // Verify announcement exists and belongs to team
    const existing = await prisma.announcement.findFirst({
      where: { id, teamId: authContext.clubId },
    });

    if (!existing) {
      return notFoundResponse('Announcement');
    }

    const body = await request.json();
    const validationResult = updateAnnouncementSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title, body: announcementBody, priority, practiceId, expiresAt } = validationResult.data;

    // If practiceId changing, verify new practice belongs to team
    if (practiceId !== undefined && practiceId !== null) {
      const practice = await prisma.practice.findFirst({
        where: { id: practiceId, teamId: authContext.clubId },
      });

      if (!practice) {
        return notFoundResponse('Practice not found or does not belong to your club');
      }
    }

    // Build update data object (only include defined fields)
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (announcementBody !== undefined) updateData.body = announcementBody;
    if (priority !== undefined) updateData.priority = priority;
    if (practiceId !== undefined) updateData.practiceId = practiceId;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    // Update announcement
    const announcement = await prisma.announcement.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ announcement });
  } catch (error) {
    return serverErrorResponse(error, 'announcements:PATCH');
  }
}

// DELETE: Archive announcement (soft delete, coaches only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context: authContext } = result;

    // Check permission
    if (!authContext.ability.can('manage', 'Announcement')) {
      return forbiddenResponse('You do not have permission to delete announcements');
    }

    const { id } = await context.params;

    // Verify announcement exists and belongs to team
    const existing = await prisma.announcement.findFirst({
      where: { id, teamId: authContext.clubId },
    });

    if (!existing) {
      return notFoundResponse('Announcement');
    }

    // Soft delete by setting archivedAt
    await prisma.announcement.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'announcements:DELETE');
  }
}
