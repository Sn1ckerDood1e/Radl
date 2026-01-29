import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Validate redirect is a safe relative path to prevent open redirect attacks
function getSafeRedirect(next: string | null): string {
  if (!next) return '/';
  // Must start with / and not be a protocol-relative URL (//)
  if (next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeRedirect(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If no code or error during exchange, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=auth_callback_error', requestUrl.origin)
  );
}
