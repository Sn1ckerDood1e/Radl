import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuthRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limit check FIRST
  const rateLimit = await checkAuthRateLimit(clientIp, 'forgot-password');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many password reset requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email } = parsed.data;
  const supabase = await createClient();

  // Always return success to prevent email enumeration
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  // Log event (fire and forget)
  logAuditEvent(
    { clubId: 'system', userId: 'anonymous', ipAddress: clientIp },
    { action: 'PASSWORD_RESET_REQUESTED', targetType: 'Auth', metadata: { email, success: !error } }
  ).catch(console.error);

  // Always return success to prevent email enumeration
  return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
}
