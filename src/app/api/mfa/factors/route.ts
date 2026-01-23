import { NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { getMfaStatus, getRemainingBackupCodesCount } from '@/lib/auth/mfa';

/**
 * GET /api/mfa/factors
 * Get MFA status and enrolled factors
 */
export async function GET() {
  try {
    const { user, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getMfaStatus();
    const remainingBackupCodes = await getRemainingBackupCodesCount(user.id);

    return NextResponse.json({
      ...status,
      remainingBackupCodes,
    });
  } catch (error) {
    console.error('Failed to get MFA status:', error);
    return NextResponse.json(
      { error: 'Failed to get MFA status' },
      { status: 500 }
    );
  }
}
