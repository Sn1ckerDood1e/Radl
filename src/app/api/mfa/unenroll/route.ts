import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unenrollMfa } from '@/lib/auth/mfa';
import { createAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

const unenrollSchema = z.object({
  factorId: z.string().uuid(),
});

/**
 * POST /api/mfa/unenroll
 * Remove MFA factor and delete backup codes
 */
export async function POST(request: NextRequest) {
  try {
    const { user, clubId, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = unenrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await unenrollMfa(parsed.data.factorId);

    const logger = createAuditLogger(request, {
      userId: user.id,
      clubId: clubId || 'system',
    });
    await logger.log({
      action: 'MFA_UNENROLLED',
      targetType: 'User',
      targetId: user.id,
      metadata: { factorId: parsed.data.factorId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MFA unenroll failed:', error);
    return NextResponse.json(
      { error: 'Failed to remove MFA' },
      { status: 500 }
    );
  }
}
