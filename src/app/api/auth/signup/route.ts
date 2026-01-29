import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuthRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  redirectTo: z.string().optional(),
});

// Validate redirect is a safe relative path to prevent open redirect attacks
function isValidRedirect(redirect: string | undefined): redirect is string {
  if (!redirect) return false;
  // Must start with / and not be a protocol-relative URL (//)
  return redirect.startsWith('/') && !redirect.startsWith('//');
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limit check FIRST
  const rateLimit = await checkAuthRateLimit(clientIp, 'signup');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password, redirectTo } = parsed.data;
  const supabase = await createClient();

  // Build email redirect URL with next parameter if redirect is valid
  const origin = request.headers.get('origin') || request.headers.get('host') || '';
  const protocol = origin.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = origin.includes('://') ? origin : `${protocol}://${origin}`;

  const signUpOptions: { email: string; password: string; options?: { emailRedirectTo?: string } } = {
    email,
    password,
  };

  if (isValidRedirect(redirectTo)) {
    signUpOptions.options = {
      emailRedirectTo: `${baseUrl}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    };
  }

  const { data, error } = await supabase.auth.signUp(signUpOptions);

  // Log event
  if (data.user) {
    logAuditEvent(
      { clubId: 'system', userId: data.user.id, ipAddress: clientIp },
      { action: 'SIGNUP_SUCCESS', targetType: 'Auth', metadata: { email } }
    ).catch(console.error);
  } else if (error) {
    logAuditEvent(
      { clubId: 'system', userId: 'anonymous', ipAddress: clientIp },
      { action: 'SIGNUP_FAILED', targetType: 'Auth', metadata: { email, error: error?.message } }
    ).catch(console.error);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user, message: 'Check your email to confirm your account' });
}
