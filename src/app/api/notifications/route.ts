import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

// GET: Get user's notifications
// Note: This endpoint queries by userId, not team_id (user-scoped data)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Check for unread filter
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build where clause
    const whereClause: { userId: string; read?: boolean } = {
      userId: user.id,
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 notifications
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        linkUrl: n.linkUrl,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    return serverErrorResponse(error, 'notifications:GET');
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    const body = await request.json();
    const { notificationIds, markAllRead } = body as {
      notificationIds?: string[];
      markAllRead?: boolean;
    };

    if (markAllRead) {
      // Mark all user's notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: { read: true },
      });
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.id, // Ensure user owns the notifications
        },
        data: { read: true },
      });
    } else {
      return NextResponse.json(
        { error: 'Must provide notificationIds or markAllRead' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'notifications:PATCH');
  }
}
