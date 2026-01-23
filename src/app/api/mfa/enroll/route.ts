import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { enrollMfa } from '@/lib/auth/mfa';
import { enrollMfaSchema } from '@/lib/validations/mfa';
import { createAuditLogger } from '@/lib/audit/logger';

/**
 * POST /api/mfa/enroll
 * Start MFA enrollment - returns QR code and backup codes
 */
export async function POST(request: NextRequest) {
  try {
    const { user, clubId, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = enrollMfaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await enrollMfa(parsed.data.friendlyName);

    // Audit log (enrollment started - not yet verified)
    const logger = createAuditLogger(request, {
      userId: user.id,
      clubId: clubId || 'system',
    });
    await logger.log({
      action: 'MFA_ENROLLED',
      targetType: 'User',
      targetId: user.id,
      metadata: { factorId: result.id },
    });

    return NextResponse.json({
      id: result.id,
      totp: result.totp,
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    console.error('MFA enrollment failed:', error);
    return NextResponse.json(
      { error: 'Failed to start MFA enrollment' },
      { status: 500 }
    );
  }
}
