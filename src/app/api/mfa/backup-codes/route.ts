import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { regenerateBackupCodes, getRemainingBackupCodesCount } from '@/lib/auth/mfa';
import { createAuditLogger } from '@/lib/audit/logger';

/**
 * GET /api/mfa/backup-codes
 * Get count of remaining unused backup codes
 */
export async function GET() {
  try {
    const { user, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await getRemainingBackupCodesCount(user.id);

    return NextResponse.json({ remainingCount: count });
  } catch (error) {
    console.error('Failed to get backup code count:', error);
    return NextResponse.json(
      { error: 'Failed to get backup codes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mfa/backup-codes
 * Regenerate backup codes (deletes old, creates new)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, clubId, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const codes = await regenerateBackupCodes();

    const logger = createAuditLogger(request, {
      userId: user.id,
      clubId: clubId || 'system',
    });
    await logger.log({
      action: 'MFA_BACKUP_CODES_REGENERATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { codesGenerated: codes.length },
    });

    return NextResponse.json({ backupCodes: codes });
  } catch (error) {
    console.error('Failed to regenerate backup codes:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}
