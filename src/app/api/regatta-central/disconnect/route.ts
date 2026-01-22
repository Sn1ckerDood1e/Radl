import { NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { disconnectRegattaCentral } from '@/lib/regatta-central/client';

// POST: Disconnect Regatta Central account
export async function POST() {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can disconnect Regatta Central');

    await disconnectRegattaCentral(claims.team_id);

    return NextResponse.json({ success: true, message: 'Regatta Central disconnected' });
  } catch (error) {
    return serverErrorResponse(error, 'regatta-central/disconnect:POST');
  }
}
