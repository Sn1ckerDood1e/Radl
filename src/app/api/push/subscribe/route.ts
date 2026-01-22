import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { isVapidConfigured } from '@/lib/push/vapid';

/**
 * POST /api/push/subscribe
 * Store a push notification subscription for the authenticated user.
 *
 * Body: PushSubscriptionJSON from browser's pushManager.subscribe()
 * - endpoint: string (push service URL)
 * - keys: { p256dh: string, auth: string }
 * - expirationTime?: number | null
 */
export async function POST(request: NextRequest) {
  // Check VAPID configuration
  if (!isVapidConfigured()) {
    return NextResponse.json(
      { error: 'Push notifications not configured' },
      { status: 503 }
    );
  }

  const { user, claims, error } = await getClaimsForApiRoute();
  if (error || !user) return unauthorizedResponse();
  if (!claims?.team_id) return forbiddenResponse('No team associated');

  try {
    const body = await request.json();
    const { endpoint, keys, expirationTime } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    // Upsert subscription (endpoint is unique)
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        expirationTime: expirationTime ? new Date(expirationTime) : null,
        userAgent: request.headers.get('user-agent') || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        teamId: claims.team_id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        expirationTime: expirationTime ? new Date(expirationTime) : null,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({ success: true, id: subscription.id });
  } catch (err) {
    return serverErrorResponse(err, 'push:subscribe');
  }
}
