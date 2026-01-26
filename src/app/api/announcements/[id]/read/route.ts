import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from '@/lib/errors';

// POST: Mark announcement as read for current user
export async function POST(
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
    const { id } = await context.params;

    // Verify announcement exists and belongs to user's team
    const announcement = await prisma.announcement.findFirst({
      where: { id, teamId: authContext.clubId },
    });

    if (!announcement) {
      return notFoundResponse('Announcement');
    }

    // Upsert read receipt (prevents duplicate key errors)
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: authContext.userId,
        },
      },
      create: {
        announcementId: id,
        userId: authContext.userId,
      },
      update: {}, // No-op if already exists
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'announcements:read:POST');
  }
}
