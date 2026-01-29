# Phase 27: Secrets, Logging & Rate Limiting - Research

**Researched:** 2026-01-28
**Domain:** Security hardening - secrets management, audit logging, authentication rate limiting
**Confidence:** HIGH

## Summary

Phase 27 is the final security phase of v2.2 Security Audit milestone. It focuses on three distinct security areas that work together to protect the application from common attack vectors:

1. **Secrets Management:** Ensuring no sensitive credentials are exposed in client bundles, environment variables are properly scoped, and API keys are hashed in the database.

2. **Audit Logging:** Extending the existing AuditLog infrastructure to capture all authentication events and ensuring logs are immutable through RLS policies and database triggers.

3. **Rate Limiting:** Extending the existing Upstash-based rate limiting to protect authentication endpoints (login, signup, password reset) from brute force attacks.

The codebase already has strong foundations in all three areas. The AuditLog model exists with ~25 action types. Rate limiting via `@upstash/ratelimit` is implemented for damage reports and join endpoints. Environment variables follow NEXT_PUBLIC_ conventions. This phase is primarily about verification, gap-filling, and hardening.

**Primary recommendation:** Verify existing implementations meet requirements, add missing rate limiting to auth endpoints via middleware, ensure AuditLog immutability via RLS policies and database triggers, and implement automated secrets scanning in CI/CD.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @upstash/ratelimit | ^2.0.8 | Rate limiting via Redis | Configured in `/src/lib/rate-limit/index.ts` |
| @upstash/redis | ^1.36.1 | Redis client | Used by rate limiter |
| Prisma AuditLog | N/A | Audit log storage | Model defined in schema.prisma |
| Supabase RLS | PostgreSQL | Row-level security | Needs AuditLog policy |

### New Tools for CI/CD (Recommended)
| Tool | Purpose | Integration |
|------|---------|-------------|
| TruffleHog | Secrets scanning in git history | GitHub Actions |
| @next/bundle-analyzer | Client bundle inspection | Optional dev dependency |
| semgrep | Static analysis for secrets | GitHub Actions |

### Not Needed
| Tool | Reason |
|------|--------|
| External audit logging service | AuditLog table with RLS immutability sufficient |
| Separate rate limiting service | Supabase built-in + Upstash covers needs |
| Secrets manager (Vault, AWS Secrets Manager) | Environment variables sufficient for current scale |

**Installation (if needed):**
```bash
# For bundle analysis (optional dev dependency)
npm install --save-dev @next/bundle-analyzer
```

## Architecture Patterns

### Current Secrets Architecture

```
Environment Variables
         │
         ├─── NEXT_PUBLIC_* (client-safe)
         │    ├── NEXT_PUBLIC_SUPABASE_URL
         │    ├── NEXT_PUBLIC_SUPABASE_ANON_KEY
         │    ├── NEXT_PUBLIC_APP_URL
         │    └── NEXT_PUBLIC_VAPID_PUBLIC_KEY
         │
         └─── Server-only (never exposed)
              ├── SUPABASE_SERVICE_ROLE_KEY (admin operations)
              ├── DATABASE_URL / DIRECT_URL (Prisma)
              ├── UPSTASH_REDIS_REST_URL/TOKEN
              ├── RESEND_API_KEY
              ├── VAPID_PRIVATE_KEY
              └── RC_CLIENT_ID/SECRET
```

### Pattern 1: Rate Limiting in Middleware (NEW)

**What:** Apply rate limiting at middleware level for auth endpoints
**When to use:** Authentication endpoints that call Supabase directly from client

```typescript
// Source: Pattern based on existing /src/lib/rate-limit/index.ts

// In middleware.ts - add before existing auth checks
const authEndpoints = ['/login', '/signup', '/auth/callback'];

if (authEndpoints.some(path => pathname === path)) {
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(clientIp, 'auth');

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      }
    );
  }
}
```

**Challenge:** Login/signup are client-side pages using `supabase.auth.signInWithPassword()` directly. Rate limiting needs to happen at API route level, not client component level.

### Pattern 2: Audit Log Immutability via RLS + Trigger

**What:** Prevent modification/deletion of audit logs
**Implementation:**

```sql
-- RLS Policy: Allow INSERT only, no UPDATE/DELETE for authenticated users
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated users (via app)
CREATE POLICY "audit_log_insert" ON "AuditLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow reads for admins only (scoped by clubId)
CREATE POLICY "audit_log_select" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    (public.is_club_admin_or_higher() OR public.is_facility_admin())
  );

-- No UPDATE policy = updates blocked
-- No DELETE policy = deletes blocked

-- Trigger as defense-in-depth (blocks even service role)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();
```

### Pattern 3: Auth Event Logging via Client Hook

**What:** Log authentication events from Supabase Auth
**Challenge:** Supabase auth happens client-side; need to capture events server-side

```typescript
// Option A: onAuthStateChange listener in layout (client-side)
// Sends event to server for logging
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Call API to log event
        await fetch('/api/auth/log-event', {
          method: 'POST',
          body: JSON.stringify({ event, userId: session?.user.id }),
        });
      }
    }
  );
  return () => subscription.unsubscribe();
}, []);

// Option B: Server-side logging in auth callback route
// /api/auth/callback/route.ts already handles auth callback
// Add logging there for SIGNED_IN events
```

### Pattern 4: Secrets Scanning in CI/CD

**What:** Automated detection of secrets in code and git history
**Implementation:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:

jobs:
  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --results=verified,unknown
```

### Anti-Patterns to Avoid

1. **Logging auth events in client code only:** Client-side logs can be bypassed/manipulated
2. **Rate limiting after auth attempt:** Must happen BEFORE to prevent brute force
3. **Using localStorage for tokens:** Vulnerable to XSS; use httpOnly cookies (Supabase SSR does this)
4. **Hardcoding secrets "just for testing":** Even in test files, secrets can leak

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom token bucket | @upstash/ratelimit | Distributed, serverless-ready, already installed |
| Secrets scanning | grep for patterns | TruffleHog | 800+ credential patterns, git history scanning |
| Auth event capture | Custom auth interceptor | Supabase onAuthStateChange | Official SDK, handles all edge cases |
| Bundle analysis | Manual inspection | @next/bundle-analyzer | Visual, comprehensive, official Next.js tool |
| Audit log immutability | Application-level checks | RLS + triggers | Database-level enforcement cannot be bypassed |

**Key insight:** Supabase has built-in rate limiting for auth endpoints (2 emails/hour, 30 OTPs/hour). For additional protection (brute force on password attempts), add Upstash rate limiting at the API route level.

## Common Pitfalls

### Pitfall 1: Client-Side Auth Doesn't Hit API Routes

**What goes wrong:** Login/signup pages call `supabase.auth.signInWithPassword()` directly from client components, bypassing middleware/API routes entirely.

**Why it happens:** Supabase JS SDK handles auth client-side for better UX (no server round-trip).

**How to avoid:** Create server actions or API routes that wrap Supabase auth calls:
```typescript
// /app/api/auth/login/route.ts
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, 'login');
  if (!rateLimit.success) return rateLimitResponse(rateLimit);

  // Now call Supabase auth
  const { email, password } = await request.json();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Log the event
  if (data.user) {
    await logAuditEvent({ action: 'LOGIN_SUCCESS', userId: data.user.id, ... });
  } else {
    await logAuditEvent({ action: 'LOGIN_FAILED', metadata: { email, error }, ... });
  }

  return NextResponse.json({ data, error });
}
```

**Warning signs:** Rate limit tests pass for API routes but not login page; auth events not appearing in audit log.

### Pitfall 2: NEXT_PUBLIC_ Variables in Build vs Runtime

**What goes wrong:** NEXT_PUBLIC_ variables are inlined at build time, not runtime. Changing them after deploy has no effect.

**Why it happens:** Next.js replaces `process.env.NEXT_PUBLIC_*` references with literal values during `next build`.

**How to avoid:**
- For truly dynamic runtime config, use `publicRuntimeConfig` (pages router) or fetch from API
- For build-time config that varies by environment, ensure CI/CD sets correct values before build

**Warning signs:** Deployed app uses wrong Supabase URL even after env var change.

### Pitfall 3: Supabase Built-in Rate Limits May Not Be Enough

**What goes wrong:** Supabase's default 30 OTPs/hour or "2 emails per hour" doesn't prevent password brute force attacks.

**Why it happens:** Supabase rate limits focus on preventing email flooding, not password guessing. Password attempts against `signInWithPassword` may not be limited.

**How to avoid:** Add application-level rate limiting for login attempts:
- 5-10 attempts per IP per 15 minutes for login
- Separate limits for signup (prevent account enumeration)
- Separate limits for password reset (prevent email flooding)

**Warning signs:** Attacker can attempt unlimited passwords; no 429 responses from login endpoint.

### Pitfall 4: AuditLog RLS Must Allow Service Role Inserts

**What goes wrong:** RLS policy blocks audit log inserts from server-side code.

**Why it happens:** If RLS is too restrictive, even valid audit logging fails.

**How to avoid:**
- Audit logging uses Prisma (server-side), which typically uses connection pooling
- Verify Prisma connects with a role that can INSERT into AuditLog
- Consider making AuditLog INSERT policy permissive (`WITH CHECK (true)`) since only server can insert

**Warning signs:** "RLS policy violation" errors when logging audit events.

### Pitfall 5: Secrets in Git History Even After Removal

**What goes wrong:** Removing a secret from current code doesn't remove it from git history.

**Why it happens:** Git stores complete history; `git rm` only affects current state.

**How to avoid:**
- Use TruffleHog to scan entire git history
- If secret found in history: rotate the secret immediately
- Consider `git filter-branch` or BFG Repo-Cleaner only if secret was never deployed
- Prevention: pre-commit hooks that block secrets

**Warning signs:** TruffleHog finds secrets even though they're not in current code.

## Code Examples

### Rate Limiting for Auth API Route

```typescript
// /src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAuditEvent, createAuditLogger } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  // Rate limit check FIRST
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(clientIp, 'login');

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  }

  const { email, password } = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Log the event (fire and forget for performance)
  if (data.user) {
    // Success: log with user context
    // Note: We may not have clubId yet, use 'system' or first club
    logAuditEvent(
      { clubId: 'system', userId: data.user.id, ipAddress: clientIp },
      { action: 'LOGIN_SUCCESS', targetType: 'Auth', metadata: { email } }
    ).catch(console.error);
  } else {
    // Failure: log attempt (no user context)
    logAuditEvent(
      { clubId: 'system', userId: 'anonymous', ipAddress: clientIp },
      { action: 'LOGIN_FAILED', targetType: 'Auth', metadata: { email, error: error?.message } }
    ).catch(console.error);
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ user: data.user });
}
```

### Audit Log Immutability Migration

```sql
-- /supabase/migrations/00009_audit_log_immutability.sql

-- Enable RLS on AuditLog (if not already)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- INSERT policy: Allow authenticated users (server-side code uses authenticated context)
-- Note: Prisma typically uses service role which bypasses RLS, but this is defense-in-depth
CREATE POLICY "audit_log_insert" ON "AuditLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT policy: Only admins can view audit logs, scoped by club
CREATE POLICY "audit_log_select_admin" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    (public.is_club_admin_or_higher() OR public.is_facility_admin())
  );

-- Self-view policy: Users can view their own actions
CREATE POLICY "audit_log_select_own" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- NO UPDATE policy = updates blocked by RLS
-- NO DELETE policy = deletes blocked by RLS

-- Trigger as defense-in-depth (catches service role modifications)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- Verify
COMMENT ON TABLE "AuditLog" IS 'Immutable audit log. Retention: 365 days.';
```

### Client Bundle Secrets Check Script

```bash
#!/bin/bash
# /scripts/check-bundle-secrets.sh
# Run after `npm run build`

echo "Checking for secrets in client bundle..."

SECRETS_PATTERNS=(
  "service_role"
  "sk_live"
  "sk_test"
  "supabase_service"
  "DATABASE_URL"
  "DIRECT_URL"
  "RESEND_API_KEY"
  "VAPID_PRIVATE"
  "RC_CLIENT_SECRET"
  "password"
  "secret"
)

FOUND=0
for pattern in "${SECRETS_PATTERNS[@]}"; do
  if grep -ri "$pattern" .next/static/chunks/ 2>/dev/null; then
    echo "FOUND: Pattern '$pattern' in client bundle!"
    FOUND=1
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "No secrets found in client bundle."
  exit 0
else
  echo "ERROR: Secrets detected in client bundle!"
  exit 1
fi
```

### TruffleHog GitHub Action

```yaml
# /.github/workflows/security.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for scanning

      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --results=verified,unknown

  bundle-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Check for secrets in bundle
        run: |
          chmod +x scripts/check-bundle-secrets.sh
          ./scripts/check-bundle-secrets.sh
```

### Extended Audit Actions

```typescript
// /src/lib/audit/actions.ts - additions needed

export const AUDITABLE_ACTIONS = {
  // ... existing actions ...

  // Authentication events (NEW for Phase 27)
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',           // User logged in successfully
  LOGIN_FAILED: 'LOGIN_FAILED',             // Failed login attempt
  LOGOUT: 'LOGOUT',                         // User logged out
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',  // Password reset email sent
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',  // Password successfully reset
  SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',         // New user registered
  SIGNUP_FAILED: 'SIGNUP_FAILED',           // Registration failed

  // Permission denied (NEW for Phase 27)
  PERMISSION_DENIED: 'PERMISSION_DENIED',   // 403 response logged

  // ... existing actions ...
} as const;
```

## State of the Art

| Old Approach | Current Approach | Status in Codebase |
|--------------|------------------|-------------------|
| Manual secrets check | CI/CD secrets scanning (TruffleHog) | NOT IMPLEMENTED |
| No rate limiting on auth | Supabase built-in + Upstash | PARTIAL (non-auth routes only) |
| Application-level audit immutability | RLS + database triggers | NOT IMPLEMENTED |
| JWT claims for auth logging | Supabase onAuthStateChange | NOT IMPLEMENTED |
| grep for secrets in bundle | @next/bundle-analyzer + CI script | NOT IMPLEMENTED |

**2026 Security Concerns:**
- [CVE-2025-55183](https://vercel.com/kb/bulletin/security-bulletin-cve-2025-55184-and-cve-2025-55183): Next.js RSC source code exposure - verify React 19.2.3+ and Next.js 16.1.3+
- Supabase Auth rate limits are configurable via Management API (premium)
- TruffleHog now detects 800+ credential types with active verification

## Gap Analysis: Requirements vs Implementation

### SECR (Secrets) Requirements

| Requirement | Status | Implementation Notes |
|-------------|--------|---------------------|
| SECR-01: No secrets in client bundle | NEEDS VERIFICATION | Build output must be scanned |
| SECR-02: NEXT_PUBLIC_ properly scoped | IMPLEMENTED | Only URL, anon key, app URL exposed |
| SECR-03: Service role not client-accessible | IMPLEMENTED | Only in admin.ts (server-side) |
| SECR-04: API keys hashed in database | IMPLEMENTED | SHA-256 in api-key.ts |
| SECR-05: No hardcoded credentials | NEEDS VERIFICATION | TruffleHog scan needed |

### AUDIT Requirements

| Requirement | Status | Implementation Notes |
|-------------|--------|---------------------|
| AUDIT-01: Auth events logged | NOT IMPLEMENTED | Need login/logout/failed attempt logging |
| AUDIT-02: Data modification logged | PARTIAL | Some CRUD logged, gaps exist |
| AUDIT-03: Permission denied logged | NOT IMPLEMENTED | 403 responses not logged |
| AUDIT-04: Logs include user/timestamp/details | IMPLEMENTED | AuditLog schema has all fields |
| AUDIT-05: Logs immutable | NOT IMPLEMENTED | Need RLS policy + trigger |

### RATE Requirements

| Requirement | Status | Implementation Notes |
|-------------|--------|---------------------|
| RATE-01: Login rate limited | NOT IMPLEMENTED | Client-side auth bypasses API |
| RATE-02: Signup rate limited | NOT IMPLEMENTED | Client-side auth bypasses API |
| RATE-03: Password reset rate limited | NOT IMPLEMENTED | Client-side auth bypasses API |
| RATE-04: Proper headers in responses | IMPLEMENTED | Pattern exists in damage-reports |
| RATE-05: Per-IP or per-user limiting | IMPLEMENTED | IP-based in rate-limit/index.ts |

## Implementation Approach

### Secrets Verification (Verification-Only)

1. **Manual bundle check:** Build and grep for patterns
2. **CI integration:** Add TruffleHog action
3. **Environment audit:** Document all env vars and their exposure level

### Audit Logging (Gap-Filling)

1. **New audit actions:** Add auth event types to actions.ts
2. **Auth event logging:** Create server actions for login/logout that wrap Supabase
3. **Permission denied logging:** Add logging to forbiddenResponse() helper
4. **Immutability:** Create migration for RLS + trigger

### Rate Limiting (Architecture Change)

**Challenge:** Current login/signup pages use `supabase.auth.signInWithPassword()` directly from client components. This bypasses all server-side middleware and API routes.

**Options:**

1. **Server Actions (Recommended):** Convert auth forms to use server actions
   - Pro: Works with Next.js 16 architecture
   - Pro: Rate limiting happens server-side
   - Con: Requires refactoring login/signup pages

2. **API Routes:** Create `/api/auth/login`, `/api/auth/signup` routes
   - Pro: Clear separation of concerns
   - Pro: Easy to add rate limiting
   - Con: Extra network hop

3. **Supabase Built-in + Captcha:** Rely on Supabase's built-in limits + add captcha
   - Pro: No code changes
   - Con: Supabase limits may not prevent password brute force
   - Con: Captcha degrades UX

**Recommendation:** Option 2 (API Routes) - creates clear audit logging points and rate limiting without major refactoring.

## Open Questions

1. **Auth logging granularity:**
   - What we know: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT are clear events
   - What's unclear: Should failed MFA verification have its own action? Token refresh?
   - Recommendation: Start with core events, extend based on security needs

2. **Rate limit windows:**
   - What we know: Current implementation uses 10 req/hour for damage reports
   - What's unclear: Appropriate windows for auth (5/15min? 10/hour?)
   - Recommendation: 5 attempts per 15 minutes for login, 3/hour for password reset

3. **Audit log retention:**
   - What we know: Schema comment says 365 days
   - What's unclear: Automatic cleanup mechanism?
   - Recommendation: Implement pg_cron job for cleanup (separate from Phase 27)

4. **Cross-tenant audit access:**
   - What we know: FACILITY_ADMIN should see all clubs' logs in facility
   - What's unclear: Current RLS only checks clubId, not facilityId hierarchy
   - Recommendation: Add facility-aware policy for FACILITY_ADMIN

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/home/hb/radl/src/lib/rate-limit/index.ts`
- Codebase analysis: `/home/hb/radl/src/lib/audit/logger.ts`
- Codebase analysis: `/home/hb/radl/src/lib/auth/api-key.ts`
- Codebase analysis: `/home/hb/radl/.env.example`
- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- [TruffleHog GitHub Action](https://github.com/marketplace/actions/trufflehog-oss)

### Secondary (MEDIUM confidence)
- [Upstash Rate Limiting](https://upstash.com/blog/nextjs-ratelimiting)
- [PostgreSQL Audit Triggers](https://wiki.postgresql.org/wiki/Audit_trigger)
- [Supabase onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)

### Tertiary (LOW confidence)
- WebSearch results on Next.js bundle analysis patterns
- Community patterns for auth event logging

## Metadata

**Confidence breakdown:**
- Secrets scoping: HIGH - Direct env file and codebase review
- Audit logging gaps: HIGH - Schema analysis vs requirements comparison
- Rate limiting architecture: MEDIUM - Client-side auth complicates implementation
- Immutability patterns: HIGH - PostgreSQL RLS + triggers well-documented

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days)
