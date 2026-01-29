# Security Audit Architecture

**Project:** Radl Multi-Tenant SaaS
**Architecture:** Next.js 16 App Router + Supabase Auth + Prisma 6 + PostgreSQL
**Researched:** 2026-01-28

## Executive Summary

This document defines the security audit structure for Radl, a multi-tenant rowing team management SaaS. The architecture employs defense-in-depth with three isolation layers: database-level RLS, middleware authentication, and application-level CASL permissions. The audit must verify tenant isolation at each layer, test authorization bypass vectors, and validate JWT claim integrity.

**Critical vulnerability context:** CVE-2025-29927 (CVSS 9.1) affects Next.js 11.1.4-15.2.2 self-hosted deployments, allowing middleware bypass via `x-middleware-subrequest` header manipulation. While this codebase uses Next.js 16, the audit must verify no similar bypass vectors exist.

## Audit Layers

Security in this architecture operates across six distinct layers, each requiring specific audit techniques.

### Layer 1: Edge Middleware (First Defense)

**Location:** `/src/middleware.ts`

**What to audit:**
- Authentication verification using `supabase.auth.getUser()` (NOT `getSession()` - susceptible to JWT forgery)
- Public route allowlist (`/login`, `/signup`, `/auth/callback`, `/join/*`, `/report/*`, `/api/equipment/*`)
- API key authentication for `/api/*` routes (Bearer token with `sk_` prefix)
- JWT token refresh mechanism
- Cookie handling and security flags

**Verification approach:**
```bash
# Test 1: Unauthenticated access to protected routes
curl http://localhost:3000/dashboard
# Expected: 302 redirect to /login

# Test 2: Public route access without auth
curl http://localhost:3000/report/[equipment-id]
# Expected: 200 OK (anonymous access allowed)

# Test 3: API key authentication
curl -H "Authorization: Bearer sk_test_invalid" http://localhost:3000/api/practices
# Expected: 401 Invalid API key

# Test 4: CVE-2025-29927 bypass attempt
curl -H "x-middleware-subrequest: 1" http://localhost:3000/dashboard
# Expected: Should NOT bypass auth (verify Next.js 16+ immunity)
```

**Known vulnerabilities:**
- Middleware can be bypassed through URL rewrites or client-side navigation if not properly configured
- `getSession()` is vulnerable to JWT forgery - code correctly uses `getUser()`
- API key validation happens in middleware but permissions checked in route handlers (correct defense-in-depth)

**Audit checklist:**
- [ ] Verify `getUser()` used everywhere, never `getSession()`
- [ ] Test all public routes for unintended data exposure
- [ ] Verify API key rotation and revocation works
- [ ] Test middleware bypass vectors (rewrites, client navigation, header manipulation)
- [ ] Confirm cookie security flags (HttpOnly, Secure, SameSite)
- [ ] Verify middleware matcher excludes static assets correctly

### Layer 2: JWT Claims & Custom Access Token Hook

**Location:** `/supabase/migrations/00003_custom_access_token_hook.sql`, `/supabase/migrations/00006_facility_access_token_hook.sql`

**What to audit:**
- Custom access token hook injects `team_id`, `facility_id`, `club_id`, `user_role` into JWT
- Hook runs as `SECURITY DEFINER` - privilege escalation vector if compromised
- Claims sourced from `TeamMember`, `ClubMembership`, `FacilityMembership` tables
- Token signature verification and expiration validation

**JWT claims structure:**
```typescript
interface JWTClaims {
  sub: string;              // user_id (Supabase auth.users.id)
  team_id?: string;         // Legacy single-team claim
  club_id: string;          // Current club context
  facility_id?: string;     // Facility if applicable
  user_role: string;        // Legacy single-role claim
  roles: string[];          // Array of roles (CASL uses this)
  exp: number;              // Expiration timestamp
  iat: number;              // Issued at timestamp
}
```

**Verification approach:**
```typescript
// Test JWT claim manipulation
// 1. Decode JWT and modify club_id claim
// 2. Re-sign with guessed secret (should fail)
// 3. Attempt to use modified token
// Expected: 401 Unauthorized due to invalid signature

// Test claim injection
// 1. Create user in Team A
// 2. Extract JWT, modify team_id to Team B
// 3. Make API request with modified JWT
// Expected: Rejected due to signature validation

// Test stale claims
// 1. Remove user from club
// 2. Use existing JWT before expiration
// Expected: Should fail at RLS layer (not in JWT)
```

**Known vulnerabilities:**
- JWT claims are cached until expiration - membership changes not reflected until token refresh
- HS256 algorithm susceptible to weak secret attacks (verify Supabase uses RS256 or strong HS256 secret)
- Custom hook runs with elevated privileges - SQL injection in hook would bypass all security

**Audit checklist:**
- [ ] Verify JWT signature algorithm (prefer RS256 over HS256)
- [ ] Test JWT claim tampering with modified club_id/facility_id
- [ ] Verify token expiration respected (test with expired JWT)
- [ ] Check custom hook SQL for injection vulnerabilities
- [ ] Test membership removal - verify stale JWT fails at RLS layer
- [ ] Confirm `aud`, `iss`, `exp`, `nbf` claims validated
- [ ] Test none algorithm attack (JWT with "alg": "none")

### Layer 3: Row Level Security (Database Isolation)

**Location:** `/supabase/migrations/00002_rls_policies.sql`, `/supabase/migrations/00008_facility_rls_policies.sql`

**What to audit:**
- All tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- Policies use `auth.uid()` to get current user from JWT
- Helper functions `get_user_team_id()`, `get_user_role()` for policy enforcement
- Multi-tenant isolation: `WHERE team_id = get_user_team_id()`
- Facility-level access patterns for shared equipment
- Service role bypass (connection pooling uses service role - must not leak data)

**RLS policy structure:**
```sql
-- Example: Practice table RLS
CREATE POLICY "Users can view own team practices"
ON "Practice" FOR SELECT
TO authenticated
USING (team_id = public.get_user_team_id());

CREATE POLICY "Coaches can create practices"
ON "Practice" FOR INSERT
TO authenticated
WITH CHECK (
  team_id = public.get_user_team_id()
  AND public.get_user_role() IN ('COACH', 'CLUB_ADMIN')
);
```

**Verification approach:**
```sql
-- Test 1: Cross-tenant data access (should fail)
-- Connect as User A (team_id = 'aaa')
SELECT * FROM "Practice" WHERE team_id = 'bbb';
-- Expected: Empty result set (RLS filters out)

-- Test 2: Direct table access bypass attempt
SET ROLE authenticated;
SELECT * FROM "Practice";
-- Expected: Only own team's practices visible

-- Test 3: Helper function bypass
SELECT * FROM "Practice" WHERE team_id IN (
  SELECT id FROM "Team" -- Attempt to see all teams
);
-- Expected: RLS still enforces team_id filter

-- Test 4: Service role bypass (connection pooling concern)
SET ROLE service_role;
SELECT * FROM "Practice";
-- Expected: ALL practices visible (by design, but API must filter)
```

**Known vulnerabilities:**
- RLS policies disabled on any table = complete tenant isolation failure
- Helper functions using `LIMIT 1` - multi-club users may get wrong club
- Service role bypasses RLS - API routes using Prisma must not leak this access
- RLS performance: Complex policies can DoS database (check query plans)
- JWT claim staleness: User removed from team still has access until token expires

**Audit checklist:**
- [ ] Verify RLS enabled on ALL tables (check with pg_catalog query)
- [ ] Test cross-tenant queries with different user JWTs
- [ ] Verify helper functions handle multi-club memberships correctly
- [ ] Test Prisma queries - confirm RLS still applies (not bypassed by pooling)
- [ ] Check query performance with EXPLAIN ANALYZE on RLS policies
- [ ] Test anonymous access routes (`/report/*` - should NOT have RLS or use special policy)
- [ ] Verify equipment booking conflicts across clubs (facility-shared equipment)

### Layer 4: API Route Authorization (CASL Abilities)

**Location:** `/src/lib/auth/get-auth-context.ts`, `/src/lib/permissions/ability.ts`, `/src/app/api/**/*.ts`

**What to audit:**
- `getAuthContext()` creates CASL ability from JWT claims
- Every API route calls `getAuthContext()` before data access
- CASL rules defined per role: FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT
- `accessibleBy()` filters Prisma queries based on abilities
- No role inheritance - FACILITY_ADMIN cannot create lineups without COACH role
- View mode semantics: 'facility' (read-only), 'club' (scoped read-only), null (full access)

**Authorization flow:**
```typescript
// API route pattern
export async function GET(request: NextRequest) {
  // 1. Get auth context (includes CASL ability)
  const result = await getAuthContext(request);
  if (!result.success) {
    return unauthorizedResponse(); // 401 or 403
  }

  // 2. Check permission
  if (!result.context.ability.can('read', 'Practice')) {
    return forbiddenResponse();
  }

  // 3. Query with accessibleBy filter
  const practices = await prisma.practice.findMany({
    where: {
      AND: [
        accessibleBy(result.context.ability).Practice,
        { teamId: result.context.clubId }
      ]
    }
  });

  return NextResponse.json({ practices });
}
```

**Verification approach:**
```bash
# Test 1: ATHLETE tries to create practice (should fail)
curl -H "Cookie: sb-auth-token=[athlete-jwt]" \
  -X POST http://localhost:3000/api/practices \
  -d '{"name":"Test","seasonId":"..."}'
# Expected: 403 Forbidden

# Test 2: COACH accesses another club's practice (should fail)
curl -H "Cookie: sb-auth-token=[coach-jwt]" \
  http://localhost:3000/api/practices/[other-club-practice-id]
# Expected: 404 Not Found (RLS filtered, not 403)

# Test 3: FACILITY_ADMIN tries to create lineup without COACH role (should fail)
curl -H "Cookie: sb-auth-token=[facility-admin-jwt]" \
  -X POST http://localhost:3000/api/lineups \
  -d '{"blockId":"..."}'
# Expected: 403 Forbidden (no COACH role)

# Test 4: API key with ATHLETE permissions
curl -H "Authorization: Bearer sk_test_athlete_key" \
  http://localhost:3000/api/practices
# Expected: 200 OK with practices (read-only)

# Test 5: Parent accessing non-linked athlete
curl -H "Cookie: sb-auth-token=[parent-jwt]" \
  http://localhost:3000/api/athletes/[unlinked-athlete-id]
# Expected: 403 Forbidden or 404 Not Found
```

**Known vulnerabilities:**
- Route handler forgets to call `getAuthContext()` - bypasses all authorization
- CASL ability defined but not enforced in query (`can()` check but no `accessibleBy()` filter)
- Direct Prisma query without `accessibleBy()` - leaks cross-tenant data despite RLS
- API key permissions inherit creator's roles - revocation doesn't update active keys
- Missing permission checks on DELETE/UPDATE operations (only checking CREATE/READ)

**Audit checklist:**
- [ ] Verify ALL API routes call `getAuthContext()` at entry point
- [ ] Check CASL `can()` permissions match HTTP method (GET=read, POST=create, etc.)
- [ ] Verify `accessibleBy()` used in ALL Prisma queries
- [ ] Test role boundaries (ATHLETE cannot manage, COACH can, etc.)
- [ ] Verify multi-role users get combined permissions correctly
- [ ] Test API key permissions match creator's current roles (or fail if revoked)
- [ ] Check nested resource access (e.g., lineup -> practice -> club ownership chain)
- [ ] Test viewMode restrictions for FACILITY_ADMIN (read-only in drill-down)

### Layer 5: Prisma Query Layer (ORM Security)

**Location:** `/src/lib/prisma.ts`, all API route Prisma queries

**What to audit:**
- All queries include `teamId` or `clubId` filter (defense-in-depth with RLS)
- No use of `$queryRawUnsafe` or `$executeRawUnsafe` with user input
- Prisma parameterized queries prevent SQL injection
- Connection pooling uses service role (bypasses RLS) - must filter in application
- JSON field queries (metadata, customFields) - potential NoSQL injection

**Security patterns:**
```typescript
// SAFE: Parameterized query
const practices = await prisma.practice.findMany({
  where: {
    teamId: context.clubId,  // Always scope to tenant
    id: practiceId           // User input is parameterized
  }
});

// UNSAFE: Raw query with user input
const practices = await prisma.$queryRawUnsafe(
  `SELECT * FROM "Practice" WHERE id = '${practiceId}'` // SQL injection!
);

// SAFE: Raw query with Prisma.sql
const practices = await prisma.$queryRaw`
  SELECT * FROM "Practice" WHERE id = ${practiceId}
`;

// VULNERABLE: NoSQL-style operator injection
const filter = JSON.parse(request.body); // User controls filter
const practices = await prisma.practice.findMany({
  where: filter  // Attacker could inject: { teamId: { not: "aaa" } }
});

// SAFE: Whitelist allowed filters
const { seasonId, startDate } = z.object({
  seasonId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional()
}).parse(request.body);
const practices = await prisma.practice.findMany({
  where: {
    teamId: context.clubId,
    seasonId: seasonId,
    date: startDate ? { gte: new Date(startDate) } : undefined
  }
});
```

**Verification approach:**
```bash
# Test 1: SQL injection via practice name
curl -X POST http://localhost:3000/api/practices \
  -d '{"name":"Test'; DROP TABLE \"Practice\"; --","seasonId":"..."}'
# Expected: Practice created with literal string (parameterized)

# Test 2: Operator injection via filter
curl -X GET 'http://localhost:3000/api/practices?filter={"teamId":{"not":"actual-id"}}'
# Expected: 400 Bad Request (filter not whitelisted) OR empty results (RLS enforces)

# Test 3: Time-based blind SQL injection (ORM leak)
curl 'http://localhost:3000/api/practices?sort={"date":"asc","name":"pg_sleep(5)"}'
# Expected: Fast response (Prisma prevents, but test anyway)

# Test 4: JSON field injection
curl -X POST http://localhost:3000/api/seasons/[id]/eligibility \
  -d '{"customFields":{"$ne":null}}'
# Expected: Validation error (JSON structure not validated)
```

**Known vulnerabilities:**
- Prisma operator injection through unvalidated filter objects (NoSQL-style attacks)
- Raw query usage with string interpolation (SQL injection)
- ORM leak attacks (time-based blind SQL through sort/filter parameters)
- JSON field queries without schema validation (nested injection)
- Missing tenant scoping on queries (relies only on RLS, not defense-in-depth)

**Audit checklist:**
- [ ] Search codebase for `$queryRawUnsafe` and `$executeRawUnsafe` usage
- [ ] Verify all user input validated with Zod schemas before Prisma queries
- [ ] Check ALL queries include `teamId` or `clubId` filter (even with RLS)
- [ ] Test filter/sort parameters for operator injection
- [ ] Verify JSON field queries (customFields, metadata) have validation
- [ ] Check relationship traversals don't leak cross-tenant data
- [ ] Test performance of complex queries (DoS via expensive filters)

### Layer 6: Client-Side Security (Defense Against Client Manipulation)

**Location:** `/src/app/**/*.tsx` (React Server Components and Client Components)

**What to audit:**
- Server Components fetch data directly (no client-side data exposure)
- Client Components receive only necessary data via props
- No sensitive data in client-side props (tokens, secrets, unfiltered data)
- API calls from client use fetch with credentials (cookies)
- No authorization logic in client code (server validates everything)

**Verification approach:**
```javascript
// Test 1: Inspect React component props in DevTools
// Look for: JWT tokens, API keys, unfiltered user lists, other tenant data
// Expected: Only user's own data or public data in props

// Test 2: Intercept API calls and replay with modified parameters
const response = await fetch('/api/practices/[other-club-id]', {
  method: 'GET',
  credentials: 'include'
});
// Expected: 404 or 403 (server validates ownership)

// Test 3: Modify client-side JavaScript to call unauthorized endpoints
// Use browser console to call internal API functions
// Expected: Server still enforces authorization

// Test 4: Check for hardcoded secrets in client bundles
// Search JS bundle for: API keys, JWT secrets, database credentials
grep -r "sk_" .next/static/
// Expected: No secrets found
```

**Known vulnerabilities:**
- Server Components accidentally expose sensitive data in props
- Client Components make assumptions about authorization (server must validate)
- Environment variables with `NEXT_PUBLIC_` prefix exposed to client
- Overly broad type signatures leak data structure (TypeScript types)

**Audit checklist:**
- [ ] Review Server Component data fetching - confirm no over-fetching
- [ ] Check Client Component props - no sensitive data (use DevTools)
- [ ] Verify no authorization checks in client code (all server-side)
- [ ] Search for `NEXT_PUBLIC_` env vars - confirm none are secrets
- [ ] Test API calls with modified parameters (client can't be trusted)
- [ ] Check for secrets in compiled JavaScript bundles

## Audit Order (Recommended Sequence)

The audit should proceed in this order to catch the most critical issues first and understand dependency chains.

### Phase 1: Foundation Verification (Day 1)

**Goal:** Confirm baseline security mechanisms are in place and functioning.

1. **RLS Enabled Check**
   - Query pg_catalog to list all tables and RLS status
   - Verify EVERY table in public schema has RLS enabled
   - Check for tables with policies but RLS disabled (policy=true, enabled=false)

2. **Middleware Authentication**
   - Review middleware.ts line-by-line
   - Verify `getUser()` used, not `getSession()`
   - Test public route allowlist (try accessing protected routes)
   - Confirm API key validation works

3. **JWT Configuration**
   - Extract JWT from browser (cookies or localStorage)
   - Decode and inspect claims structure
   - Verify signature algorithm (should be RS256 or strong HS256)
   - Test token expiration handling

4. **Environment Variables**
   - Review .env.example and actual .env
   - Verify no secrets use `NEXT_PUBLIC_` prefix
   - Check database URL uses connection pooling (not direct)
   - Confirm VAPID keys, API keys stored securely

**Deliverable:** Foundation security checklist with pass/fail for each item.

### Phase 2: Tenant Isolation Testing (Day 2-3)

**Goal:** Verify users from Tenant A cannot access Tenant B's data under any circumstance.

1. **RLS Policy Testing**
   - Create two test tenants (Club A, Club B)
   - Create test users in each club with various roles
   - Execute cross-tenant queries with each user's JWT
   - Verify empty result sets (not 403 errors - RLS filters silently)
   - Test direct table access via SQL console

2. **API Route Tenant Scoping**
   - For each API route, test with other club's resource IDs
   - Expected: 404 Not Found or empty response (not 403)
   - Test nested resources (lineup -> practice -> club ownership chain)
   - Verify pagination doesn't leak cross-tenant data

3. **Multi-Club User Testing**
   - Create user with memberships in Club A and Club B
   - Switch active club context via `/api/clubs/switch`
   - Verify data access updates to new club's scope
   - Test that old club's data no longer accessible

4. **Facility-Shared Equipment**
   - Test shared equipment visibility across clubs
   - Verify booking conflicts prevent double-booking
   - Confirm club-specific equipment not visible to other clubs
   - Test equipment ownership transfer (facility -> club)

**Deliverable:** Tenant isolation test report with attempted bypass vectors and results.

### Phase 3: Authorization Bypass Testing (Day 4-5)

**Goal:** Attempt to bypass authorization at each layer using known attack vectors.

1. **JWT Manipulation**
   - Decode JWT, modify claims (club_id, roles), re-encode
   - Attempt to use modified JWT (should fail signature validation)
   - Test "none" algorithm attack (`{"alg":"none"}`)
   - Try weak HMAC secrets (if HS256 used)
   - Test expired JWTs (should be rejected)

2. **CASL Permission Bypass**
   - ATHLETE user attempts to create practice (should fail)
   - COACH user tries to assign FACILITY_ADMIN role (should fail)
   - PARENT user accesses non-linked athlete data (should fail)
   - FACILITY_ADMIN attempts lineup creation without COACH role (should fail)
   - Test permission grant expiration (temporary elevated access)

3. **API Route Direct Access**
   - Identify routes that might skip `getAuthContext()` check
   - Test with no authentication (should 401)
   - Test with API key lacking required permissions (should 403)
   - Try accessing admin routes with non-admin key

4. **Middleware Bypass Vectors**
   - Test CVE-2025-29927 attack (x-middleware-subrequest header)
   - Try URL rewrites to skip middleware matching
   - Test client-side navigation bypassing middleware
   - Attempt to access static files with sensitive names

**Deliverable:** Authorization bypass test report with attack vectors and mitigation verification.

### Phase 4: Data Injection & Input Validation (Day 6)

**Goal:** Test for SQL injection, NoSQL injection, and input validation failures.

1. **SQL Injection Testing**
   - Test all text inputs with SQL injection payloads
   - Search codebase for `$queryRawUnsafe` usage
   - Verify Prisma parameterization working correctly
   - Test time-based blind SQL injection (ORM leak)

2. **Operator Injection (NoSQL-style)**
   - Send Prisma operator objects in filter parameters
   - Example: `{"teamId": {"not": "actual-id"}}`
   - Verify filters are whitelisted, not raw from user input
   - Test JSON field queries (customFields, metadata)

3. **Input Validation**
   - Test API routes with missing required fields
   - Send invalid UUIDs, dates, enums
   - Verify Zod schema validation rejects bad input
   - Test oversized inputs (DoS via large payloads)

4. **API Route Enumeration**
   - Attempt to access API routes not in public documentation
   - Test for information disclosure in error messages
   - Verify 404 vs 403 responses don't leak information
   - Check for verbose error messages exposing stack traces

**Deliverable:** Input validation test report with injection attempts and validation effectiveness.

### Phase 5: API Key & Session Security (Day 7)

**Goal:** Verify API key management, session handling, and token security.

1. **API Key Lifecycle**
   - Create API key with COACH permissions
   - Verify key works for authorized actions
   - Revoke key, verify immediate invalidation
   - Test key expiration (if configured)
   - Verify key creator role change propagates

2. **Session Management**
   - Test session expiration behavior
   - Verify logout invalidates session
   - Test concurrent sessions (same user, multiple devices)
   - Check session fixation vulnerabilities
   - Verify CSRF protection on state-changing operations

3. **MFA Security**
   - Test MFA enrollment flow
   - Verify backup codes work for recovery
   - Test MFA bypass attempts (remove factor, use old code)
   - Verify MFA required for FACILITY_ADMIN and CLUB_ADMIN

4. **SSO/SAML Security**
   - Test SSO configuration (if enabled)
   - Verify role mapping from IdP groups
   - Test SSO bypass attempts (direct login with password)
   - Check for XML signature wrapping attacks (SAML)

**Deliverable:** API key and session security report with token lifecycle verification.

### Phase 6: Comprehensive Integration Testing (Day 8-9)

**Goal:** Test realistic attack scenarios combining multiple vectors.

1. **Privilege Escalation Scenarios**
   - ATHLETE creates lineup by exploiting race condition
   - PARENT gains COACH access via invitation manipulation
   - Expired permission grant allows continued elevated access
   - Multi-club user leverages club switch to access wrong data

2. **Data Exfiltration Scenarios**
   - Paginate through all practices attempting to access other clubs
   - Use export API to dump data with manipulated filters
   - Leverage equipment usage logs to infer other clubs' schedules
   - Access audit logs to see other users' actions

3. **Denial of Service Scenarios**
   - Create 10,000 practices to overwhelm database
   - Send complex RLS queries to cause timeouts
   - Upload large images to damage report endpoints
   - Request all audit logs for all time (expensive query)

4. **Cross-Tenant Conflict Scenarios**
   - Book same equipment slot from two clubs simultaneously
   - Create practices with overlapping times for shared equipment
   - Manipulate facility settings from club admin role
   - Transfer equipment ownership to wrong club

**Deliverable:** Integration test scenarios report with realistic attack simulations.

### Phase 7: Verification & Documentation (Day 10)

**Goal:** Confirm all findings, document issues, verify fixes.

1. **Issue Cataloging**
   - Categorize findings by severity (Critical, High, Medium, Low)
   - Document reproduction steps for each issue
   - Assign OWASP Top 10 or CWE classifications
   - Provide remediation recommendations

2. **Regression Testing**
   - Re-run all tests from previous phases
   - Verify no new issues introduced by fixes
   - Test edge cases discovered during audit
   - Confirm defense-in-depth working at all layers

3. **Documentation Review**
   - Verify security documentation exists for developers
   - Check that RLS policies are documented
   - Confirm API key usage guidelines are clear
   - Review access control matrix (role -> permission mapping)

4. **Compliance Check**
   - Verify audit logging captures security events
   - Confirm data retention policies enforced (365 days)
   - Check GDPR compliance (data export, deletion)
   - Verify SOC 2 requirements met (access controls, logging)

**Deliverable:** Final security audit report with executive summary, findings, and remediation roadmap.

## Verification Approach

Each layer requires different verification techniques.

### Automated Testing Tools

**RLS Policy Testing:**
```bash
# Install pgTAP for database unit tests
CREATE EXTENSION pgtap;

-- Example RLS test
SELECT plan(1);
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-a", "team_id": "team-a"}';
SELECT is(
  (SELECT count(*) FROM "Practice" WHERE team_id = 'team-b'),
  0::bigint,
  'User from Team A cannot see Team B practices'
);
```

**JWT Security Testing:**
```bash
# Use jwt.io or jwt-cli to decode/modify tokens
npm install -g jwt-cli

# Decode JWT
jwt decode [token]

# Test none algorithm attack
jwt encode --alg=none --payload='{"sub":"user-id","team_id":"other-team"}' --no-sign
```

**API Authorization Testing:**
```bash
# Use Postman or Bruno for API testing
# Create test collection with:
# 1. Valid requests (should succeed)
# 2. Invalid tenant access (should fail)
# 3. Insufficient permissions (should fail)
# 4. Missing authentication (should fail)

# Automated API security testing
npm install -g @apisec/scanner
apisec scan --spec openapi.json --auth-token [jwt]
```

**CASL Policy Testing:**
```typescript
// Unit test CASL abilities
import { defineAbilityFor } from '@/lib/permissions/ability';

describe('CASL Authorization', () => {
  it('ATHLETE cannot create practices', () => {
    const ability = defineAbilityFor({
      userId: 'athlete-1',
      clubId: 'club-a',
      roles: ['ATHLETE'],
      viewMode: null
    });
    expect(ability.can('create', 'Practice')).toBe(false);
  });

  it('COACH can create practices in own club', () => {
    const ability = defineAbilityFor({
      userId: 'coach-1',
      clubId: 'club-a',
      roles: ['COACH'],
      viewMode: null
    });
    expect(ability.can('create', 'Practice')).toBe(true);
  });
});
```

## References & Sources

This security audit architecture is based on current industry best practices and specific research for Next.js, Supabase, and multi-tenant SaaS applications.

### Next.js Security

- [Complete Next.js security guide 2025: authentication, API protection & best practices](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) - Comprehensive coverage of Next.js App Router security patterns
- [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) - Official Next.js security guidance
- [Next.js security checklist](https://blog.arcjet.com/next-js-security-checklist/) - Detailed audit checklist for Next.js applications
- **Critical:** CVE-2025-29927 (CVSS 9.1) - Middleware bypass vulnerability affecting Next.js 11.1.4-15.2.2. Patched in 15.2.3+, 14.2.25+, 13.5.9+, 12.3.5+.

### Supabase RLS & Authentication

- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Official RLS documentation and best practices
- [Supabase RLS Security Audit and Fixes with MCP](https://docs.continue.dev/guides/supabase-mcp-database-workflow) - Automated RLS audit workflow
- [Enforcing Row Level Security in Supabase: Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) - Real-world multi-tenant RLS implementation
- [Token Security and Row Level Security](https://supabase.com/docs/guides/auth/oauth-server/token-security) - JWT security in Supabase context

### Multi-Tenant Security

- [Implementing Secure Multi-Tenancy in SaaS Applications](https://dzone.com/articles/secure-multi-tenancy-saas-developer-checklist) - Developer checklist for tenant isolation
- [Ensuring Tenant Data Isolation in Multi-Tenant SaaS Systems](https://www.tenupsoft.com/blog/strategies-for-tenant-data-isolation-in-multi-tenant-based-saas-applications.html) - Strategies for tenant data isolation
- [Architecting Secure Multi-Tenant Data Isolation](https://medium.com/@justhamade/architecting-secure-multi-tenant-data-isolation-d8f36cb0d25e) - Architecture patterns for isolation
- [Security practices in AWS multi-tenant SaaS environments](https://aws.amazon.com/blogs/security/security-practices-in-aws-multi-tenant-saas-environments/) - Cloud-specific security practices

### Authorization & CASL

- [CASL - Isomorphic Authorization JavaScript library](https://casl.js.org/) - Official CASL documentation
- [Frontend Authorization with Next.js and CASL](https://www.permit.io/blog/frontend-authorization-with-nextjs-and-casl-tutorial) - Step-by-step CASL integration
- **Security Alert:** [AI Agents Are Becoming Authorization Bypass Paths](https://thehackernews.com/2026/01/ai-agents-are-becoming-privilege.html) - Emerging authorization bypass risks (January 2026)

### Prisma & Database Security

- [How Prisma ORM Prevents SQL Injections](https://medium.com/@farrelshevaa/how-prisma-orm-prevents-sql-injections-aligning-with-owasp-best-practices-6ff62c35ba1b) - Prisma's SQL injection protections
- [Prisma and PostgreSQL vulnerable to NoSQL injection](https://www.aikido.dev/blog/prisma-and-postgresql-vulnerable-to-nosql-injection) - Operator injection vulnerabilities in Prisma
- [Prisma Raw Query Leads to SQL Injection? Yes and No](https://www.nodejs-security.com/blog/prisma-raw-query-sql-injection) - Safe vs unsafe raw query usage
- [plORMbing your Prisma ORM with Time-based Attacks](https://www.elttam.com/blog/plorming-your-primsa-orm/) - ORM leak vulnerabilities

### JWT Security

- [JWT Vulnerabilities List: 2026 Security Risks & Mitigation Guide](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide) - Current JWT vulnerabilities and mitigations
- [JWT Security Best Practices: Checklist for APIs](https://curity.io/resources/learn/jwt-best-practices/) - Comprehensive JWT security checklist
- [JWT Security: Common Vulnerabilities and Prevention](https://www.apisec.ai/blog/jwt-security-vulnerabilities-prevention) - JWT-specific attack vectors

### API Penetration Testing

- [API Penetration Testing: A Complete Guide for 2026](https://www.practical-devsecops.com/api-penetration-testing/) - Modern API pentesting methodology
- [API Security Testing in 2026: Step by Step Guide](https://www.testingxperts.com/blog/api-security-testing/) - Systematic API security testing approach
- [API Penetration Testing: Objective, Methodology & Use Cases](https://www.vaadata.com/blog/api-penetration-testing-objective-methodology-black-box-grey-box-and-white-box-tests/) - Different testing approaches for APIs

---

**Audit confidence level:** HIGH (based on architecture review and current security research)
**Estimated audit duration:** 10 days (1 security engineer)
**Recommended audit frequency:** Semi-annual (every 6 months) + after major architecture changes
