import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAuthRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { logAuditEvent } from '@/lib/audit/logger';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limit check FIRST
  const rateLimit = await checkAuthRateLimit(clientIp, 'login');
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Parse and validate body
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Log event (fire and forget for performance)
  if (data.user) {
    logAuditEvent(
      { clubId: 'system', userId: data.user.id, ipAddress: clientIp },
      { action: 'LOGIN_SUCCESS', targetType: 'Auth', metadata: { email } }
    ).catch(console.error);
  } else {
    logAuditEvent(
      { clubId: 'system', userId: 'anonymous', ipAddress: clientIp },
      { action: 'LOGIN_FAILED', targetType: 'Auth', metadata: { email, error: error?.message } }
    ).catch(console.error);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ user: data.user, session: data.session });
}
