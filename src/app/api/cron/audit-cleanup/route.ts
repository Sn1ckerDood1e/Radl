import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/audit-cleanup
 * Deletes audit log entries older than 365 days.
 *
 * This endpoint should be called by a scheduled job (e.g., Vercel Cron).
 * Protected by CRON_SECRET environment variable.
 *
 * Vercel Cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/audit-cleanup",
 *     "schedule": "0 3 * * *"  // Daily at 3am UTC
 *   }]
 * }
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

    // Calculate cutoff date (365 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);

    // Delete old records
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`Audit cleanup: deleted ${result.count} records older than ${cutoffDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error('Audit cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
