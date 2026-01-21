# Phase 1: Security & Foundation - Research

**Researched:** 2026-01-20
**Domain:** Multi-tenant security, rate limiting, season-scoped data
**Confidence:** HIGH

## Summary

This phase addresses critical security gaps in the existing multi-tenant Next.js 16 application using Supabase Auth and Prisma 6. The codebase has 10+ API routes with duplicated JWT claims fetching patterns, inconsistent use of `getSession()` vs `getUser()` (a security concern), and no rate limiting on sensitive endpoints like damage reports and team join attempts.

The standard approach is to:
1. Create a centralized claims helper utility that uses `getUser()` for auth validation and properly decodes JWT claims with database fallback
2. Implement rate limiting using `@upstash/ratelimit` with Redis (the standard for serverless Next.js)
3. Add season model with multi-active-season support and eligibility tracking
4. Implement consistent error handling with error reference IDs

**Primary recommendation:** Extract claims helper to `@/lib/auth/claims.ts`, integrate Upstash rate limiting middleware, and implement season model with proper RLS-compliant queries.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @upstash/ratelimit | ^2.0.8 | Rate limiting | Connectionless HTTP-based, designed for serverless/Next.js |
| @upstash/redis | ^1.34.0 | Redis client | Required for @upstash/ratelimit, no TCP connections |
| zod | ^4.3.5 | Validation | Already in use, perfect for season/eligibility schemas |
| jwt-decode | ^4.0.0 | JWT parsing | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.1.6 | Error reference IDs | Already in use, generate short unique error IDs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @upstash/ratelimit | next-rate-limit | next-rate-limit is simpler but doesn't scale to serverless, requires in-memory storage |
| Application-level filtering | PostgreSQL RLS | RLS is more secure but requires Prisma Client Extensions setup, consider for Phase 2+ |

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Environment Variables Needed:**
```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth/
│   │   ├── authorize.ts     # Existing (keep for Server Components)
│   │   └── claims.ts        # NEW: Centralized claims helper for API routes
│   ├── rate-limit/
│   │   └── index.ts         # Rate limiter configuration
│   └── errors/
│       └── index.ts         # Error response helpers with reference IDs
├── app/
│   ├── error.tsx            # Route segment error boundary
│   ├── global-error.tsx     # Global error boundary (replaces layout)
│   └── api/                  # Existing API routes (refactor to use claims helper)
```

### Pattern 1: Centralized Claims Helper
**What:** Single helper function for API routes that handles auth verification and claims extraction
**When to use:** All API routes that need user identity and team context

**Example:**
```typescript
// src/lib/auth/claims.ts
import { createClient } from '@/lib/supabase/server';
import { jwtDecode } from 'jwt-decode';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface UserClaims {
  userId: string;
  email: string;
  teamId: string | null;
  role: 'COACH' | 'ATHLETE' | 'PARENT' | null;
}

export type ClaimsResult =
  | { success: true; claims: UserClaims }
  | { success: false; error: NextResponse };

export async function getApiClaims(): Promise<ClaimsResult> {
  const supabase = await createClient();

  // IMPORTANT: Use getUser() for security - validates JWT on server
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      success: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  // Get session for JWT claims (after getUser validates auth)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      success: false,
      error: NextResponse.json({ error: 'No session found' }, { status: 401 })
    };
  }

  const jwtClaims = jwtDecode<{ team_id?: string; user_role?: string }>(
    session.access_token
  );

  let teamId = jwtClaims.team_id || null;
  let role = jwtClaims.user_role as UserClaims['role'] || null;

  // Database fallback for fresh team memberships
  if (!teamId) {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: user.id },
    });
    if (membership) {
      teamId = membership.teamId;
      role = membership.role as UserClaims['role'];
    }
  }

  return {
    success: true,
    claims: {
      userId: user.id,
      email: user.email || '',
      teamId,
      role,
    },
  };
}

// Convenience helpers
export function requireTeamClaims(claims: UserClaims):
  { success: true; teamId: string; role: UserClaims['role'] } |
  { success: false; error: NextResponse } {

  if (!claims.teamId) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'No team associated with user' },
        { status: 403 }
      ),
    };
  }
  return { success: true, teamId: claims.teamId, role: claims.role };
}

export function requireRole(
  claims: UserClaims,
  allowedRoles: UserClaims['role'][]
): { success: true } | { success: false; error: NextResponse } {

  if (!claims.role || !allowedRoles.includes(claims.role)) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    };
  }
  return { success: true };
}
```

### Pattern 2: Rate Limiting Wrapper
**What:** Reusable rate limiting for API routes
**When to use:** Sensitive endpoints (damage reports, join attempts)

**Example:**
```typescript
// src/lib/rate-limit/index.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = Redis.fromEnv();

// Different rate limiters for different use cases
export const rateLimiters = {
  // Anonymous damage report submission: 10 per hour per IP
  damageReport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:damage-report',
    analytics: true,
  }),

  // Team join attempts: 5 per hour per IP
  joinAttempt: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:join-attempt',
    analytics: true,
  }),

  // Authenticated API calls: Higher limits per user
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'ratelimit:authenticated',
    analytics: true,
  }),
};

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const { success, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }

  return { allowed: true };
}
```

### Pattern 3: Error Response with Reference ID
**What:** Consistent error responses with trackable IDs
**When to use:** All 500 errors, global error boundary

**Example:**
```typescript
// src/lib/errors/index.ts
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';

export function serverError(error: unknown, context?: string): NextResponse {
  const errorId = nanoid(10);

  // Log with error ID for support reference
  console.error(`[${errorId}]`, context || 'Server error:', error);

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      errorId,
    },
    { status: 500 }
  );
}
```

### Pattern 4: Season Model Schema
**What:** Season container with eligibility tracking
**When to use:** Season CRUD, eligibility status queries

**Prisma Schema Addition:**
```prisma
// Season container for organizing team data
model Season {
  id        String    @id @default(uuid())
  teamId    String
  name      String    // e.g., "Fall 2025", "Novice Training"
  startDate DateTime?
  endDate   DateTime?
  status    SeasonStatus @default(ACTIVE)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  team              Team              @relation(fields: [teamId], references: [id], onDelete: Cascade)
  athleteEligibility AthleteEligibility[]

  @@index([teamId])
  @@index([teamId, status])
}

enum SeasonStatus {
  ACTIVE
  ARCHIVED
}

// Eligibility tracking per athlete per season
model AthleteEligibility {
  id             String   @id @default(uuid())
  seasonId       String
  athleteId      String   // References AthleteProfile.id

  // Core eligibility flags
  isEligible     Boolean  @default(false)  // Manual override
  waiverSigned   Boolean  @default(false)
  swimTestPassed Boolean  @default(false)

  // Custom fields (team-defined requirements)
  customFields   Json     @default("{}")  // { "medicalClearance": true, "paidDues": false }

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  season  Season         @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  athlete AthleteProfile @relation(fields: [athleteId], references: [id], onDelete: Cascade)

  @@unique([seasonId, athleteId])
  @@index([seasonId])
  @@index([athleteId])
}
```

### Anti-Patterns to Avoid
- **Using getSession() alone for auth:** Always call getUser() first - getSession() doesn't validate JWT authenticity
- **Duplicating claims helper in each route:** Centralize to single import
- **In-memory rate limiting:** Won't work across serverless instances
- **Blocking on ineligible athletes:** Use warnings, allow coach override

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Token bucket in-memory | @upstash/ratelimit | In-memory doesn't work serverless, Upstash is HTTP-based |
| JWT validation | Manual signature check | supabase.auth.getUser() | getUser validates on Supabase server, handles refresh |
| Unique error IDs | UUID v4 | nanoid | Already in project, shorter (10 chars), URL-safe |
| Sliding window algorithm | Custom Redis INCR | @upstash/ratelimit | Handles edge cases, multi-region, analytics |

**Key insight:** Serverless environments require HTTP-based external state. In-memory solutions (Maps, rate-limiter-flexible defaults) fail when functions scale horizontally.

## Common Pitfalls

### Pitfall 1: getSession() Security Gap
**What goes wrong:** Using `getSession()` to verify authentication on server
**Why it happens:** getSession is faster (no network call), seems sufficient
**How to avoid:** Always call `getUser()` first for authentication. Use `getSession()` only after to extract JWT claims.
**Warning signs:** API routes that only call `getSession()` without `getUser()`

### Pitfall 2: JWT Claims Stale After Team Join
**What goes wrong:** User joins team but JWT still has null team_id until token refresh
**Why it happens:** JWTs are immutable until refreshed, custom claims set on login
**How to avoid:** Database fallback in claims helper when team_id is null
**Warning signs:** User sees "No team" error immediately after joining

### Pitfall 3: Rate Limit Key Selection
**What goes wrong:** Using user ID for rate limiting anonymous endpoints
**Why it happens:** Assuming all requests are authenticated
**How to avoid:**
- Anonymous endpoints: Use IP address (`request.headers.get('x-forwarded-for')`)
- Authenticated endpoints: Use user ID for fairer limits
**Warning signs:** Rate limits not working for anonymous damage reports

### Pitfall 4: Cross-Tenant Data Leaks
**What goes wrong:** Queries return data from other teams
**Why it happens:** Missing team_id in WHERE clause, or using user-provided ID without verification
**How to avoid:** Always include `teamId: claims.team_id` in queries, verify resource ownership before returning
**Warning signs:** Equipment/athlete IDs passed in URL without team verification

### Pitfall 5: Error Boundary Not Showing
**What goes wrong:** Errors in layout.tsx break the page, error.tsx doesn't catch them
**Why it happens:** error.tsx only catches errors in child components, not parent layout
**How to avoid:** Use global-error.tsx at app root, must include own `<html>` and `<body>` tags
**Warning signs:** White screen on layout errors instead of friendly error page

## Code Examples

Verified patterns from official sources:

### Rate Limited API Route
```typescript
// src/app/api/equipment/[id]/damage-reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, checkRateLimit } from '@/lib/rate-limit';
import { serverError } from '@/lib/errors';

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limit by IP for anonymous submissions
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimit = await checkRateLimit(rateLimiters.damageReport, ip);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    // ... rest of handler
  } catch (error) {
    return serverError(error, 'damage-reports:POST');
  }
}
```

### Refactored API Route with Claims Helper
```typescript
// src/app/api/equipment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiClaims, requireTeamClaims, requireRole } from '@/lib/auth/claims';
import { serverError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user claims
    const claimsResult = await getApiClaims();
    if (!claimsResult.success) return claimsResult.error;

    // Require team membership
    const teamResult = requireTeamClaims(claimsResult.claims);
    if (!teamResult.success) return teamResult.error;

    // Require coach role
    const roleResult = requireRole(claimsResult.claims, ['COACH']);
    if (!roleResult.success) return roleResult.error;

    // Now safely use teamResult.teamId
    // ...
  } catch (error) {
    return serverError(error, 'equipment:POST');
  }
}
```

### Global Error Boundary
```typescript
// src/app/global-error.tsx
'use client';

import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId] = useState(() => nanoid(10));

  useEffect(() => {
    console.error(`[${errorId}] Global error:`, error);
  }, [error, errorId]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We've logged this issue and are looking into it.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Error reference: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Season Eligibility Query
```typescript
// Get athlete eligibility status for a season
const eligibility = await prisma.athleteEligibility.findUnique({
  where: {
    seasonId_athleteId: {
      seasonId: seasonId,
      athleteId: athleteProfileId,
    },
  },
});

// Calculate effective eligibility
const isEffectivelyEligible = eligibility?.isEligible || (
  eligibility?.waiverSigned &&
  eligibility?.swimTestPassed &&
  // Check custom fields if any
  Object.values(eligibility?.customFields || {}).every(v => v === true)
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getSession() for auth | getUser() + getClaims() | Supabase 2.x | Security: getSession doesn't validate JWT |
| In-memory rate limiting | Upstash Redis | 2023 | Serverless compatibility |
| Global error.tsx | global-error.tsx + error.tsx | Next.js 13.4 | global-error needs own HTML/body |

**Deprecated/outdated:**
- Supabase `getSession()` for server-side auth: Still works but insecure, use `getUser()` first
- `supabase-custom-claims` package: Still works but Custom Access Token Hook is now recommended

## Open Questions

Things that couldn't be fully resolved:

1. **RLS vs Application-Level Filtering**
   - What we know: Both work; RLS is more secure but requires Prisma extension setup
   - What's unclear: Performance impact of Prisma RLS extension's forced transactions
   - Recommendation: Keep application-level filtering for Phase 1 (it's working), evaluate RLS for Phase 2

2. **Supabase Custom Access Token Hook for JWT Claims**
   - What we know: This is the modern way to add team_id/role to JWTs at login time
   - What's unclear: Whether to implement now or accept database fallback approach
   - Recommendation: Database fallback is working; Auth Hook is optimization for later

3. **Session Expiration Modal Implementation**
   - What we know: `onUnauthenticated` callback in auth context can show modal
   - What's unclear: Best UX pattern for re-auth without losing form state
   - Recommendation: Implement basic modal in Phase 1; refine UX based on user feedback

## Sources

### Primary (HIGH confidence)
- Supabase Docs: getUser() vs getSession() - https://supabase.com/docs/reference/javascript/auth-getuser
- Supabase Docs: Custom Access Token Hook - https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Upstash Ratelimit GitHub - https://github.com/upstash/ratelimit-js
- Next.js Docs: Error Handling - https://nextjs.org/docs/app/getting-started/error-handling
- Prisma Client Extensions: Row Level Security - https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security

### Secondary (MEDIUM confidence)
- Upstash Docs: Ratelimit Overview - https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- Supabase Community: Custom Claims - https://github.com/supabase-community/supabase-custom-claims

### Tertiary (LOW confidence)
- Various blog posts on Next.js session management patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Upstash is recommended in Next.js docs, widely used
- Architecture: HIGH - Based on existing codebase patterns and official docs
- Pitfalls: HIGH - Verified against Supabase docs (getSession security issue is documented)
- Season model: MEDIUM - Designed based on requirements, not industry standard

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable domain)
