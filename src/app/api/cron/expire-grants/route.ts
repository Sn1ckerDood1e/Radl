import { NextRequest, NextResponse } from 'next/server';
import {
  getExpiringGrants,
  getExpiredGrants,
  markGrantNotified,
  bulkRevokeExpiredGrants,
} from '@/lib/auth/permission-grant';
import { logAuditEvent } from '@/lib/audit/logger';

/**
 * GET /api/cron/expire-grants
 * Process permission grant expirations and send warnings.
 *
 * Runs every 4 hours via Vercel Cron.
 * - Sends 24-hour warning notifications
 * - Soft-revokes expired grants
 * - Logs audit events for expirations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 1: Send 24-hour expiration warnings
    const expiringGrants = await getExpiringGrants(24);

    for (const grant of expiringGrants) {
      // TODO: Send notification (email + push)
      // For now, just mark as notified
      await markGrantNotified(grant.id);
      console.log(`[cron] Expiration warning sent for grant ${grant.id}`);
    }

    // Step 2: Process expired grants
    const expiredGrants = await getExpiredGrants();
    const expiredIds = expiredGrants.map(g => g.id);

    if (expiredIds.length > 0) {
      await bulkRevokeExpiredGrants(expiredIds);

      // Audit log each expiration
      for (const grant of expiredGrants) {
        await logAuditEvent(
          {
            clubId: grant.clubId,
            userId: 'system', // System action
          },
          {
            action: 'PERMISSION_GRANT_EXPIRED',
            targetType: 'PermissionGrant',
            targetId: grant.id,
            metadata: {
              expiredUserId: grant.userId,
              roles: grant.roles,
              expiresAt: grant.expiresAt.toISOString(),
            },
          }
        );

        // TODO: Send expiration notification to user
        console.log(`[cron] Grant ${grant.id} expired for user ${grant.userId}`);
      }
    }

    console.log(`[cron] expire-grants: warned=${expiringGrants.length}, expired=${expiredGrants.length}`);

    return NextResponse.json({
      success: true,
      warned: expiringGrants.length,
      expired: expiredGrants.length,
    });
  } catch (error) {
    console.error('Grant expiration job failed:', error);
    return NextResponse.json(
      { error: 'Expiration job failed' },
      { status: 500 }
    );
  }
}
