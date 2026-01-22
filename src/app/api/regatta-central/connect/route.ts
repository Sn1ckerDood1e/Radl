import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { connectRegattaCentral } from '@/lib/regatta-central/client';
import { z } from 'zod';

const connectSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
  rcClubId: z.string().min(1, 'Club ID required'),
});

// POST: Connect Regatta Central account
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can connect Regatta Central');

    const body = await request.json();
    const validationResult = connectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { username, password, rcClubId } = validationResult.data;

    await connectRegattaCentral(claims.team_id, username, password, rcClubId);

    return NextResponse.json({ success: true, message: 'Regatta Central connected' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return serverErrorResponse(error, 'regatta-central/connect:POST');
  }
}
