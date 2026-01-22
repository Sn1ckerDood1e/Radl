import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * POST /api/push/unsubscribe
 * Remove a push notification subscription for the authenticated user.
 *
 * Body: { endpoint: string }
 */
export async function POST(request: NextRequest) {
  const { user, error } = await getClaimsForApiRoute();
  if (error || !user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    // Delete subscription - only delete own subscriptions
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverErrorResponse(err, 'push:unsubscribe');
  }
}
