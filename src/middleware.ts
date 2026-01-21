import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/signup',
  '/auth/callback',
  '/api/auth/callback',
];

// Routes that start with these prefixes are public
const publicPrefixes = [
  '/join/', // For invite acceptance
  '/report/', // For QR-based damage reporting
  '/api/equipment/', // For public damage report submission (anonymous allowed)
];

function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (publicRoutes.includes(pathname)) {
    return true;
  }

  // Check prefix matches
  for (const prefix of publicPrefixes) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getUser() for auth verification, NOT getSession()
  // getSession() doesn't verify the JWT and is susceptible to forgery
  // This call refreshes the auth token if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login for protected routes
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Preserve the original URL as a redirect parameter
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
