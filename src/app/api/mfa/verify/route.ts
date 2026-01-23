import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { verifyMfaCode, useBackupCode } from '@/lib/auth/mfa';
import { verifyMfaSchema, backupCodeSchema } from '@/lib/validations/mfa';
import { createAuditLogger } from '@/lib/audit/logger';

/**
 * POST /api/mfa/verify
 * Verify MFA code (TOTP or backup code)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, clubId, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Try TOTP verification first
    const totpParsed = verifyMfaSchema.safeParse(body);
    if (totpParsed.success) {
      await verifyMfaCode(totpParsed.data.factorId, totpParsed.data.code);

      const logger = createAuditLogger(request, {
        userId: user.id,
        clubId: clubId || 'system',
      });
      await logger.log({
        action: 'MFA_VERIFIED',
        targetType: 'User',
        targetId: user.id,
        metadata: { method: 'totp' },
      });

      return NextResponse.json({ success: true, method: 'totp' });
    }

    // Try backup code
    const backupParsed = backupCodeSchema.safeParse(body);
    if (backupParsed.success) {
      const valid = await useBackupCode(user.id, backupParsed.data.code);

      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid or already used backup code' },
          { status: 400 }
        );
      }

      const logger = createAuditLogger(request, {
        userId: user.id,
        clubId: clubId || 'system',
      });
      await logger.log({
        action: 'MFA_BACKUP_CODE_USED',
        targetType: 'User',
        targetId: user.id,
        metadata: { method: 'backup_code' },
      });

      return NextResponse.json({ success: true, method: 'backup_code' });
    }

    return NextResponse.json(
      { error: 'Invalid input - provide factorId+code or backup code' },
      { status: 400 }
    );
  } catch (error) {
    console.error('MFA verification failed:', error);
    return NextResponse.json(
      { error: 'Verification failed - invalid code' },
      { status: 400 }
    );
  }
}
