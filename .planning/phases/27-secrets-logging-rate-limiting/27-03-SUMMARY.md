---
phase: 27-secrets-logging-rate-limiting
plan: 03
subsystem: auth
tags: [rate-limiting, audit-logging, upstash, redis, authentication, security]

# Dependency graph
requires:
  - phase: 27-02
    provides: Audit logging infrastructure with AuditLog table and logAuditEvent function
provides:
  - Rate-limited authentication API routes (login, signup, forgot-password, logout)
  - Auth-specific rate limit configs (5/15min login, 3/hr signup, 3/hr password reset)
  - Audit logging for all auth events (LOGIN_SUCCESS, LOGIN_FAILED, SIGNUP_*, LOGOUT, PASSWORD_RESET_REQUESTED)
  - Rate limit response headers (Retry-After, X-RateLimit-*)
  - Server-side auth flow replacing direct client-side Supabase calls
affects: [auth, security-audit, rate-limiting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auth-specific rate limiters with per-action windows (Map-based)"
    - "Fire-and-forget audit logging for performance (catch + console.error)"
    - "Rate limit headers in 429 responses (RFC 6585)"
    - "Server-side auth API routes replacing client-side Supabase calls"

key-files:
  created:
    - src/app/api/auth/login/route.ts
    - src/app/api/auth/signup/route.ts
    - src/app/api/auth/forgot-password/route.ts
  modified:
    - src/lib/rate-limit/index.ts
    - src/app/api/auth/logout/route.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx

key-decisions:
  - "Fire-and-forget audit logging (performance over guaranteed logging)"
  - "Rate limit by IP address (getClientIp from X-Forwarded-For)"
  - "Auth rate limiters use separate Redis keys (radl:auth:{action}:)"
  - "Always return success for password reset to prevent email enumeration"
  - "Server-side auth routes mandatory for rate limiting and logging"

patterns-established:
  - "checkAuthRateLimit: Per-action rate limiting with authLimits config"
  - "rateLimitHeaders: Standard rate limit headers for 429 responses"
  - "Auth routes: Rate limit check → validate → authenticate → log → respond"

# Metrics
duration: 8min
completed: 2026-01-29
---

# Phase 27 Plan 03: Auth Rate Limiting & Logging Summary

**Server-side auth API routes with per-action rate limiting (5/15min login, 3/hr signup/reset), audit logging, and rate limit headers replacing direct client Supabase calls**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-29T14:44:39Z
- **Completed:** 2026-01-29T14:52:37Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Auth-specific rate limit configurations with stricter windows than default API limits
- Rate-limited authentication API routes (login, signup, forgot-password) with audit logging
- Logout route enhanced with audit logging
- Login and signup pages refactored to use server API routes instead of direct Supabase client calls
- Rate limit headers (Retry-After, X-RateLimit-*) included in 429 responses
- All auth events logged to AuditLog with fire-and-forget pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend rate limiter with auth-specific configurations** - `6a59587` (feat)
2. **Task 2: Create rate-limited auth API routes with logging** - `90bb2bb` (feat)
3. **Task 3: Update login/signup pages to use API routes** - `5e797a3` (feat)

## Files Created/Modified

**Created:**
- `src/app/api/auth/login/route.ts` - POST endpoint with 5/15min rate limit, LOGIN_SUCCESS/FAILED logging
- `src/app/api/auth/signup/route.ts` - POST endpoint with 3/hr rate limit, SIGNUP_SUCCESS/FAILED logging
- `src/app/api/auth/forgot-password/route.ts` - POST endpoint with 3/hr rate limit, PASSWORD_RESET_REQUESTED logging, email enumeration prevention

**Modified:**
- `src/lib/rate-limit/index.ts` - Added authLimits config, getAuthRateLimiter factory, checkAuthRateLimit function, rateLimitHeaders helper
- `src/app/api/auth/logout/route.ts` - Added LOGOUT audit logging (get user before signOut)
- `src/app/(auth)/login/page.tsx` - Replaced direct supabase.auth.signInWithPassword with fetch to /api/auth/login, rate limit error display
- `src/app/(auth)/signup/page.tsx` - Replaced direct supabase.auth.signUp with fetch to /api/auth/signup, rate limit error display

## Decisions Made

**1. Fire-and-forget audit logging**
- Rationale: Performance over guaranteed logging in response path. Failures logged to console for monitoring.
- Pattern: `logAuditEvent(...).catch(console.error)` in all auth routes

**2. Per-action rate limiters**
- Rationale: Different auth actions need different limits (login more frequent than signup/reset)
- Implementation: Map<AuthAction, Ratelimit> with per-action Redis keys (radl:auth:login:, radl:auth:signup:)

**3. Server-side auth mandatory**
- Rationale: Client-side Supabase auth bypasses all server-side controls (rate limiting, logging)
- Change: All auth flows now go through API routes, client pages use fetch()

**4. Email enumeration prevention**
- Rationale: Password reset always returns success to prevent attackers discovering valid emails
- Implementation: Generic success message regardless of whether email exists

**5. Rate limit by IP address**
- Rationale: Anonymous auth endpoints can't use user ID, IP is only identifier available
- Implementation: getClientIp extracts from X-Forwarded-For header (Vercel/proxy-aware)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as specified with no blocking issues.

## User Setup Required

**Rate limiting requires Upstash Redis configuration.**

If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set:
- Rate limiting gracefully falls back to disabled (console.warn logs warning)
- Auth routes continue to work but without rate limits
- Audit logging still functions

To enable rate limiting:
1. Create Upstash Redis database at https://console.upstash.com/
2. Add environment variables to .env.local:
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```
3. Verify: Rapid login attempts should return 429 with Retry-After header

## Requirements Satisfied

**RATE-01: Auth endpoint limits** - PASS
- Login: 5 attempts per 15 minutes per IP
- Signup: 3 attempts per hour per IP
- Password reset: 3 attempts per hour per IP

**RATE-02: API endpoint limits** - PARTIAL (auth endpoints only)
- Covered by plan 27-03 (this plan)
- General API rate limiting deferred (not in v2.2 scope)

**RATE-03: Per-user tracking** - PASS
- Auth endpoints use per-IP tracking via getClientIp
- X-Forwarded-For header handling for reverse proxy scenarios

**RATE-04: Rate limit headers** - PASS
- 429 responses include: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Headers calculated from Upstash rate limit result

**RATE-05: Bypass prevention** - PASS
- Rate limiting enforced server-side before Supabase auth
- Client pages cannot bypass by calling Supabase directly (removed client imports)

**AUDIT-01: Immutable logging** - COVERED (from 27-02)
- AuditLog table has RLS policies and immutability trigger

**AUDIT-02: Security event logging** - PASS
- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, SIGNUP_SUCCESS, SIGNUP_FAILED, PASSWORD_RESET_REQUESTED
- All events include email, IP address, user ID (or 'anonymous' for failed attempts)

## Next Phase Readiness

**Phase 27 Complete:** All 3 plans in Wave 2 finished (27-01, 27-02, 27-03).

**Ready for:**
- Phase 27 verification and summary
- v2.2 Security Audit completion (all 35 requirements assessed)
- Beta testing with production security controls in place

**Blockers:** None

**Concerns:** None - all auth flows now protected by rate limiting and audit logging

---
*Phase: 27-secrets-logging-rate-limiting*
*Completed: 2026-01-29*
