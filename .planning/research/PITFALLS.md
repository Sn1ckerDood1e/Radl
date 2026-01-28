# Security Audit Pitfalls

**Stack Context:** Next.js 16 App Router + Supabase Auth + PostgreSQL RLS + Prisma 6 + CASL
**Architecture:** Multi-tenant SaaS with facility → club → team hierarchy
**Researched:** 2026-01-28
**Confidence:** HIGH (verified with official sources and 2026 CVE disclosures)

---

## CRITICAL (High Risk)

### 1. React2Shell RCE (CVE-2025-55182 / CVE-2025-66478)

**What it is:**
Pre-authentication remote code execution vulnerability in React Server Components. Attacker sends specially crafted HTTP request to trigger server-side code execution without authentication. CVSS 10.0 (maximum severity).

**How it manifests:**
Vulnerable RSC protocol allows untrusted inputs to influence server-side execution behavior. Exploitation confirmed in the wild since December 2025, with threat actors stealing cloud credentials and deploying cryptominers.

**Detection:**
- Check Next.js version: vulnerable if 15.0.0-15.0.4, 15.1.0-15.1.8, 15.2.0-15.2.5, 15.3.0-15.3.5, 15.4.0-15.4.7, or 16.0.0-16.0.11
- Audit Server Components and Server Actions for external input handling
- Review logs for suspicious HTTP requests to RSC endpoints

**How to fix:**
- Upgrade to Next.js 15.4.8+ or 16.0.12+ immediately
- Rotate all application secrets after patching
- No workaround exists — patching is mandatory

**Sources:**
- [Next.js Security Advisory CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478)
- [React Critical Security Vulnerability](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [OX Security RCE Analysis](https://www.ox.security/blog/rce-in-react-server-components/)

---

### 2. Next.js Middleware Authorization Bypass (CVE-2025-29927)

**What it is:**
Attackers bypass authentication middleware by adding `x-middleware-subrequest` header to HTTP requests. CVSS 9.1 (critical).

**How it manifests:**
Next.js uses `x-middleware-subrequest` internally to track middleware recursion depth. Attacker sets this header to max recursion value, causing middleware to skip entirely.

**Detection in RowOps:**
```bash
# Check if middleware.ts properly validates headers
grep -n "x-middleware-subrequest" src/middleware.ts

# Audit if middleware is bypassable
curl -H "x-middleware-subrequest: 10" https://rowops.example.com/api/teams
```

**Vulnerable code pattern:**
```typescript
// src/middleware.ts - Current implementation MAY be vulnerable
export async function middleware(request: NextRequest) {
  // No explicit check for x-middleware-subrequest header
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

**How to fix:**
- Upgrade to Next.js 13.5.9+, 14.2.25+, or 15.2.3+
- Block `x-middleware-subrequest` header at reverse proxy/CDN level
- Add explicit header validation in middleware:
  ```typescript
  if (request.headers.has('x-middleware-subrequest')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  ```

**RowOps-specific risk:**
API key authentication bypass allows unauthorized access to `/api/*` routes, exposing club data and equipment information.

**Sources:**
- [Datadog Security Labs Analysis](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [JFrog CVE-2025-29927 Analysis](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/)
- [Vercel Postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

---

### 3. Supabase RLS Not Enabled (CVE-2025-48757)

**What it is:**
Row Level Security disabled by default on Supabase tables. 83% of exposed Supabase databases involve RLS misconfigurations. 170+ Lovable-generated apps exposed in 2025.

**How it manifests:**
Supabase auto-generates REST APIs from PostgreSQL schema, but RLS is opt-in. Attackers use simple SQL queries to dump entire database.

**Detection in RowOps:**
```sql
-- Check if RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Check for tables with RLS enabled but no policies
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = pg_tables.schemaname
      AND tablename = pg_tables.tablename
  );
```

**Vulnerable tables in RowOps:**
- `Facility` — shared boathouse data across clubs
- `Equipment` — boats and equipment (may have dual ownership)
- `EquipmentBooking` — cross-club bookings
- `ApiKey` — service role keys if leaked

**How to fix:**
```sql
-- Enable RLS on all tables
ALTER TABLE "Facility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EquipmentBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;

-- Create policies (example for facility-scoped data)
CREATE POLICY "Users see own facility data"
  ON "Facility" FOR SELECT
  USING (id = current_setting('app.facility_id', true)::uuid);
```

**RowOps-specific considerations:**
- Facility → club → team hierarchy requires cascading policies
- Shared equipment needs both facility-level and club-level policies
- API keys bypass RLS — must validate programmatically

**Sources:**
- [Supabase Security Flaw: 170+ Apps Exposed](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Fixing RLS Misconfigurations](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/)
- [Supabase RLS Complete Guide 2025](https://vibeappscanner.com/supabase-row-level-security)

---

### 4. Prisma Bypasses RLS by Default

**What it is:**
Prisma connects to PostgreSQL as `postgres` superuser, which bypasses all RLS policies.

**How it manifests:**
All Prisma queries ignore tenant isolation, returning data across all facilities/clubs. No error thrown — data just leaks silently.

**Detection in RowOps:**
```typescript
// Check DATABASE_URL in .env
// If connecting as "postgres", RLS is bypassed
DATABASE_URL="postgresql://postgres:...@..."  // ❌ VULNERABLE

// Audit Prisma queries for manual tenant filtering
const practices = await prisma.practice.findMany(); // ❌ Returns ALL practices
const practices = await prisma.practice.findMany({
  where: { team: { facilityId } }  // ✅ Manually filtered
});
```

**How to fix:**

**Option 1: Create non-superuser role (recommended)**
```sql
-- Create role with RLS enforcement
CREATE ROLE app_user LOGIN PASSWORD 'secure_password';
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Update DATABASE_URL
DATABASE_URL="postgresql://app_user:secure_password@..."
```

**Option 2: Set RLS context per query**
```typescript
// Use Prisma middleware to inject tenant context
prisma.$use(async (params, next) => {
  if (params.model) {
    await prisma.$executeRaw`
      SET LOCAL app.facility_id = ${facilityId};
      SET LOCAL app.club_id = ${clubId};
    `;
  }
  return next(params);
});
```

**Option 3: Use Prisma Client Extensions**
```typescript
// Apply tenant filter to all queries
const tenantPrisma = prisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        args.where = { ...args.where, facilityId };
        return query(args);
      }
    }
  }
});
```

**RowOps-specific risk:**
Multi-tenant hierarchy (facility → club → team) means a single query without filtering can expose:
- All facilities' equipment
- All clubs' practices
- All teams' rosters and lineups

**Sources:**
- [Prisma + Supabase RLS Policies](https://medium.com/@kavitanambissan/prisma-with-supabase-rls-policies-c72b68a62330)
- [Prisma Extension for Supabase RLS](https://github.com/dthyresson/prisma-extension-supabase-rls)
- [Supabase Docs: Prisma Integration](https://supabase.com/docs/guides/database/prisma)

---

### 5. Multi-Tenant Connection Pool Contamination

**What it is:**
Connection returned to pool without resetting tenant context, causing Request B to receive Tenant A's data (CVE-2024-10976, CVE-2025-8713).

**How it manifests:**
```
1. Request A: SET app.facility_id = 'facility-A'
2. Query runs, returns connection to pool
3. Request B: reuses same connection
4. Query runs with app.facility_id STILL = 'facility-A'
5. User from facility-B sees facility-A's data
```

**Detection:**
```typescript
// Check if queries use SET SESSION (dangerous) vs SET LOCAL (safe)
await prisma.$executeRaw`SET SESSION app.facility_id = ${facilityId}`; // ❌ Persists
await prisma.$executeRaw`SET LOCAL app.facility_id = ${facilityId}`;   // ✅ Transaction-scoped

// Audit for missing transaction wrappers
await setTenantContext(facilityId); // ❌ Context leaks without transaction
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SET LOCAL app.facility_id = ${facilityId}`;
  return tx.practice.findMany();
}); // ✅ Context resets after transaction
```

**How to fix:**

**Always use transaction-scoped context:**
```typescript
export async function queryWithTenant<T>(
  facilityId: string,
  clubId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SET LOCAL resets automatically when transaction ends
    await tx.$executeRaw`SET LOCAL app.facility_id = ${facilityId}`;
    await tx.$executeRaw`SET LOCAL app.club_id = ${clubId}`;
    return callback(tx);
  });
}

// Usage
const practices = await queryWithTenant(
  facilityId,
  clubId,
  (tx) => tx.practice.findMany()
);
```

**Never trust connection state:**
```typescript
// ❌ BAD: Connection may be poisoned from previous request
const facilityId = getCurrentFacilityId();
const data = await prisma.facility.findMany();

// ✅ GOOD: Explicit filter + transaction
const data = await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SET LOCAL app.facility_id = ${facilityId}`;
  return tx.facility.findMany({ where: { id: facilityId } });
});
```

**RowOps-specific risk:**
Facility-scoped equipment can leak across clubs. Practice lineups exposed to wrong teams. Regatta schedules visible to non-participating clubs.

**Sources:**
- [Multi-Tenant Leakage: When RLS Fails](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Why Tenant Context Must Be Scoped Per Transaction](https://dev.to/m_zinger_2fc60eb3f3897908/why-tenant-context-must-be-scoped-per-transaction-3aop)
- [PostgreSQL CVE-2024-10976](https://www.postgresql.org/support/security/CVE-2024-10976/)

---

### 6. Server Action Input Validation Missing

**What it is:**
Server Actions are public HTTP endpoints but treated like trusted internal functions. Missing input validation allows injection attacks.

**How it manifests:**
```typescript
// ❌ VULNERABLE: No validation
'use server'
export async function updatePractice(formData: FormData) {
  const practiceId = formData.get('id'); // Could be SQL injection
  const name = formData.get('name');     // Could be XSS payload

  await prisma.practice.update({
    where: { id: practiceId },  // Prisma protects SQL injection
    data: { name }              // But no XSS sanitization
  });
}
```

**Detection in RowOps:**
```bash
# Find all Server Actions
grep -r "use server" src/

# Check for missing validation
grep -A 20 "'use server'" src/app/**/*.ts | grep -v "z\." | grep -v "parse"
```

**How to fix:**

**Use Zod for all Server Action inputs:**
```typescript
'use server'
import { z } from 'zod';

const updatePracticeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  date: z.coerce.date(),
});

export async function updatePractice(formData: FormData) {
  // Validate BEFORE using any data
  const validated = updatePracticeSchema.parse({
    id: formData.get('id'),
    name: formData.get('name'),
    date: formData.get('date'),
  });

  // Re-authorize EVERY action
  const { claims } = await requireTeam();

  // Verify practice belongs to user's team
  const practice = await prisma.practice.findUnique({
    where: { id: validated.id },
    select: { teamId: true },
  });

  if (practice?.teamId !== claims.team_id) {
    throw new Error('Unauthorized');
  }

  await prisma.practice.update({
    where: { id: validated.id },
    data: { name: validated.name },
  });
}
```

**RowOps-specific patterns to audit:**
- Practice creation/update actions
- Equipment damage report submission
- Lineup editing with drag-drop
- API key creation

**Sources:**
- [Next.js Security: Server Components & Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)

---

### 7. JWT Claims Trusted Without Re-verification

**What it is:**
JWT claims (facility_id, team_id, user_role) used for authorization without server-side re-verification.

**How it manifests:**
```typescript
// ❌ VULNERABLE: JWT claims can be stale or forged
export async function deletePractice(practiceId: string) {
  const { claims } = await getUserClaims(); // Gets JWT from session

  // Assumes team_id in JWT is current — but user may have been removed
  await prisma.practice.delete({
    where: {
      id: practiceId,
      teamId: claims.team_id  // ❌ Stale claim
    }
  });
}
```

**Detection in RowOps:**
```typescript
// Check src/lib/auth/authorize.ts
// Line 17-22: getUserClaims() decodes JWT without validation
export async function getUserClaims(): Promise<CustomJwtPayload | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession(); // ❌ Doesn't verify JWT
  if (!session) return null;
  return jwtDecode<CustomJwtPayload>(session.access_token); // ❌ Trusts decoded payload
}
```

**How to fix:**

**Always query database for membership:**
```typescript
export async function deletePractice(practiceId: string) {
  const user = await requireAuth();

  // ✅ Query database for current membership
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      team: {
        include: {
          members: {
            where: { userId: user.id }
          }
        }
      }
    }
  });

  if (!practice) throw new Error('Practice not found');

  const member = practice.team.members[0];
  if (!member || member.role !== 'COACH') {
    throw new Error('Unauthorized');
  }

  await prisma.practice.delete({ where: { id: practiceId } });
}
```

**Use `getUser()` not `getSession()` in middleware:**
```typescript
// src/middleware.ts Line 67-72
// ✅ GOOD: Already using getUser() which validates JWT
const { data: { user } } = await supabase.auth.getUser(); // Verifies JWT signature

// ❌ BAD: Don't use getSession()
const { data: { session } } = await supabase.auth.getSession(); // No verification
```

**RowOps-specific risk:**
- User removed from team but JWT not expired → still has access
- User role downgraded (COACH → ATHLETE) but JWT claims role=COACH
- Facility admin adds user to club, JWT doesn't have facility_id yet

**Sources:**
- [Supabase Auth: Session Hijacking Discussion](https://github.com/orgs/supabase/discussions/23224)
- [Supabase Docs: User Sessions](https://supabase.com/docs/guides/auth/sessions)
- [JWT Vulnerabilities 2026 Guide](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide)

---

## MODERATE (Medium Risk)

### 8. CASL Abilities Checked Only on Client Side

**What it is:**
CASL isomorphic permissions used for UI rendering but not enforced on server.

**How it manifests:**
```typescript
// Client: Hides "Delete" button if not authorized
const ability = useAbility();
{ability.can('delete', 'Practice') && <DeleteButton />}

// Server: No authorization check
'use server'
export async function deletePractice(id: string) {
  await prisma.practice.delete({ where: { id } }); // ❌ No auth check
}
```

**Detection:**
```bash
# Find CASL ability checks
grep -r "ability.can" src/

# Check if corresponding Server Actions have authorization
grep -A 10 "export async function delete" src/app/**/*.ts | grep -v "requireRole"
```

**How to fix:**

**Mirror CASL checks on server:**
```typescript
'use server'
import { defineAbilityFor } from '@/lib/casl/ability';

export async function deletePractice(id: string) {
  const { user, claims } = await requireTeam();

  // Rebuild abilities server-side with current data
  const ability = defineAbilityFor(claims.user_role, claims.team_id);

  if (!ability.can('delete', 'Practice')) {
    throw new Error('Unauthorized');
  }

  await prisma.practice.delete({ where: { id } });
}
```

**RowOps-specific patterns:**
- Equipment editing (COACH vs ATHLETE permissions)
- Roster management (CLUB_ADMIN vs COACH roles)
- Facility settings (FACILITY_ADMIN only)

**Sources:**
- [CASL Roles with Persisted Permissions](https://ruleoftech.com/2022/using-casl-and-roles-with-persisted-permissions)
- [Next.js Data Security: Authorization](https://nextjs.org/docs/app/guides/data-security#authorization-in-server-actions)

---

### 9. Service Role Key Exposure

**What it is:**
`SUPABASE_SERVICE_ROLE_KEY` used in client code or committed to repository.

**How it manifests:**
```typescript
// ❌ VULNERABLE: Service role in browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ❌ Bypasses RLS
);
```

**Detection:**
```bash
# Check for leaked keys
grep -r "SERVICE_ROLE" src/
git log -p | grep "SERVICE_ROLE"

# Check .env files not in .gitignore
git ls-files .env*

# Scan with external tool
npx supabase-exposure-check https://rowops.example.com
```

**How to fix:**
- Never use service_role key in client code
- Store in environment variables without `NEXT_PUBLIC_` prefix
- Use Supabase Security Advisor in dashboard
- Rotate key if exposed (requires downtime)
- Use `anon` key for client-side operations

**RowOps context:**
- API key validation uses Prisma, which may use service role
- Equipment damage reports allow anonymous submission
- RC API integration may need elevated permissions

**Sources:**
- [Remediating Supabase Service Role JWT Leaks](https://www.gitguardian.com/remediation/supabase-service-role-jwt)
- [Supabase Exposure Check Tool](https://github.com/bscript/supabase-exposure-check)

---

### 10. Cache Poisoning via Race Condition (CVE-2025-49826)

**What it is:**
Next.js ISR cache poisoning causes persistent DoS when 204 responses are cached.

**How it manifests:**
- Attacker exploits race condition in shared response object
- 204 status code cached incorrectly
- All subsequent users receive empty response

**Detection:**
```bash
# Check Next.js version
npm list next  # Vulnerable: >=15.1.0 <15.1.8

# Check if using ISR with revalidation
grep -r "revalidate:" src/app/
```

**Vulnerable pattern in RowOps:**
```typescript
// app/[teamSlug]/practices/page.tsx
export const revalidate = 60; // ✅ Uses ISR

export default async function PracticesPage() {
  const practices = await prisma.practice.findMany();
  return <PracticesList practices={practices} />;
}
```

**How to fix:**
- Upgrade to Next.js 15.1.8+
- If using CDN, configure to NOT cache 204 responses
- Vercel-hosted apps are not affected (built-in protection)

**Sources:**
- [CVE-2025-49826 Analysis](https://www.webasha.com/blog/what-is-the-nextjs-cache-poisoning-vulnerability-cve-2025-49826-and-how-does-it-lead-to-denial-of-service-dos-attacks)
- [Next.js Cache Poisoning Research](https://zhero-web-sec.github.io/research-and-things/nextjs-cache-and-chains-the-stale-elixir)

---

### 11. Supabase JWT HS256 to ES256 Migration Incomplete

**What it is:**
Supabase migrated from HS256 (shared secret) to ES256 (asymmetric keys) in 2025. Projects still using HS256 vulnerable to key leakage.

**How it manifests:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` leaks JWT secret (if HS256)
- Attacker forges JWTs with arbitrary user_id and role
- Bypasses all authentication

**Detection:**
```bash
# Check JWT algorithm
curl https://YOUR_PROJECT.supabase.co/auth/v1/settings | jq '.jwt_algorithm'

# If returns "HS256" → vulnerable
# If returns "ES256" → secure
```

**How to fix:**
- Generate asymmetric signing key in Supabase dashboard
- Wait 20 minutes for key propagation
- Revoke old HS256 key
- Never use `NEXT_PUBLIC_` prefix for service role keys

**Sources:**
- [Supabase JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)
- [ES256 JWT Verification Error Fix](https://medium.com/@sinancsoysal/fixing-jwserror-jwsinvalidsignature-in-self-hosted-supabase-edge-functions-d4799caf4c9f)

---

### 12. Race Conditions in Hierarchical Multi-Tenant Context

**What it is:**
Async operations in Node.js can cause identity swapping where Request A's context is overwritten by Request B.

**How it manifests:**
```typescript
// Global state shared across requests (vulnerable)
let currentFacilityId: string;

export async function middleware(request: NextRequest) {
  currentFacilityId = await getFacilityId(request); // ❌ Race condition
  // Request B overwrites before Request A completes
}
```

**Detection in RowOps:**
```bash
# Check for module-level state
grep -r "^let " src/ | grep -v "const"
grep -r "^var " src/

# Audit async context propagation
grep -r "AsyncLocalStorage" src/
```

**How to fix:**

**Use AsyncLocalStorage for request context:**
```typescript
import { AsyncLocalStorage } from 'async_hooks';

const tenantContext = new AsyncLocalStorage<{
  facilityId: string;
  clubId: string;
  userId: string;
}>();

export function withTenantContext<T>(
  context: { facilityId: string; clubId: string; userId: string },
  callback: () => Promise<T>
): Promise<T> {
  return tenantContext.run(context, callback);
}

export function getTenantContext() {
  return tenantContext.getStore();
}
```

**RowOps-specific considerations:**
- Facility → club → team hierarchy requires nested context
- Equipment bookings span multiple clubs
- API key validation runs parallel to session auth

**Sources:**
- [Multi-Tenant Leakage: Context Leaks](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Hierarchical Multi-Tenant Security](https://medium.com/@ugomignon/kube-roommates-securing-and-isolating-your-multi-tenant-cluster-with-open-source-5a8eb5b10514)

---

## LOW (Low Risk but Easy to Miss)

### 13. Missing CSRF Protection on Custom Route Handlers

**What it is:**
Next.js Server Actions have built-in CSRF protection (Origin header validation), but custom Route Handlers (`route.ts`) don't.

**How it manifests:**
```typescript
// app/api/equipment/route.ts
export async function POST(request: Request) {
  const data = await request.json();
  // ❌ No CSRF token validation
  await prisma.equipment.create({ data });
}
```

**Detection:**
```bash
# Find custom route handlers
find src/app -name "route.ts"

# Check if they validate Origin header
grep -L "origin" $(find src/app -name "route.ts")
```

**How to fix:**

**Validate Origin header manually:**
```typescript
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 });
  }

  // Or check against allowlist
  const allowedOrigins = [
    'https://rowops.com',
    'https://app.rowops.com',
  ];
  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 });
  }

  const data = await request.json();
  await prisma.equipment.create({ data });
}
```

**RowOps-specific routes to check:**
- `/api/equipment/*` — Damage reports
- `/api/auth/callback` — OAuth callback
- `/api/webhooks/*` — External integrations

**Sources:**
- [Next.js Data Security: CSRF Protection](https://nextjs.org/docs/app/guides/data-security#csrf-protection)
- [Protecting Next.js Apps Against CSRF](https://www.telerik.com/blogs/protecting-nextjs-applications-cross-site-request-forgery-csrf-attacks)

---

### 14. Prisma Operator Injection

**What it is:**
Prisma query functions accepting objects from untrusted input vulnerable to operator injection (similar to NoSQL injection).

**How it manifests:**
```typescript
// ❌ VULNERABLE: User controls query operators
const searchParams = new URLSearchParams(request.url);
const filters = Object.fromEntries(searchParams); // { name: { "not": "" } }

const practices = await prisma.practice.findMany({
  where: filters // ❌ Attacker can inject operators
});
```

**Detection:**
```bash
# Find dynamic query construction
grep -r "Object.fromEntries" src/
grep -r "findMany({ where:" src/ | grep -v "{ id:"
```

**How to fix:**

**Validate query structure with Zod:**
```typescript
import { z } from 'zod';

const practiceFilterSchema = z.object({
  name: z.string().optional(),
  date: z.coerce.date().optional(),
  teamId: z.string().uuid(),
});

export async function GET(request: Request) {
  const searchParams = new URLSearchParams(request.url);

  // Parse and validate
  const filters = practiceFilterSchema.parse({
    name: searchParams.get('name'),
    date: searchParams.get('date'),
    teamId: searchParams.get('teamId'),
  });

  // Safe to use
  const practices = await prisma.practice.findMany({
    where: filters
  });
}
```

**Only allow whitelisted operators:**
```typescript
const allowedOperators = ['equals', 'contains', 'startsWith'];

function sanitizeFilter(input: any): any {
  if (typeof input !== 'object') return input;

  for (const key of Object.keys(input)) {
    if (key.startsWith('$') || key === 'not') {
      delete input[key]; // Remove operator injections
    }
  }
  return input;
}
```

**Sources:**
- [Prisma and PostgreSQL Vulnerable to NoSQL Injection](https://www.aikido.dev/blog/prisma-and-postgresql-vulnerable-to-nosql-injection)
- [Prisma Raw Query SQL Injection](https://www.nodejs-security.com/blog/prisma-raw-query-sql-injection)

---

### 15. Insufficient Index Coverage for RLS Policies

**What it is:**
RLS policies referencing unindexed columns cause performance degradation (99.94% slower).

**How it manifests:**
```sql
-- Policy filtering by userId
CREATE POLICY "Users see own teams"
  ON "TeamMember" FOR SELECT
  USING (userId = auth.uid());

-- But no index on userId → table scan
```

**Detection:**
```sql
-- Find policies without indexes
SELECT
  pol.tablename,
  pol.policyname,
  pol.qual -- WHERE clause
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes idx
    WHERE idx.schemaname = pol.schemaname
      AND idx.tablename = pol.tablename
      AND pol.qual LIKE '%' || idx.indexdef || '%'
  );
```

**How to fix:**

**Add indexes for RLS policy columns:**
```sql
-- RowOps schema.prisma Line 95-96 already has these
@@index([userId])  // ✅ Good
@@index([teamId])  // ✅ Good

-- Check for missing indexes on other tables
CREATE INDEX idx_equipment_facility ON "Equipment"(facilityId);
CREATE INDEX idx_booking_club ON "EquipmentBooking"(clubId);
```

**RowOps-specific columns to index:**
- `facilityId` (facility-scoped policies)
- `clubId` (club-scoped policies)
- `teamId` (team-scoped policies)
- `userId` (user membership checks)

**Sources:**
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Fixing RLS Performance Issues](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/)

---

### 16. API Key Validation Uses Service Role Connection

**What it is:**
API key validation queries Prisma with service role connection, bypassing RLS.

**Detection in RowOps:**
```typescript
// src/lib/auth/api-key.ts (needs audit)
export async function validateApiKey(key: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key }  // ❌ If Prisma uses service role, RLS bypassed
  });

  // Sets club context in headers
  requestHeaders.set('x-api-key-club-id', result.clubId!); // Trusted but unverified
}
```

**How to fix:**

**Validate API key with explicit club membership check:**
```typescript
export async function validateApiKey(key: string, requestedClubId?: string) {
  const apiKey = await prisma.apiKey.findUnique({
    where: {
      key,
      revokedAt: null,  // Only active keys
    },
    include: {
      club: true,  // Verify club exists
    }
  });

  if (!apiKey || apiKey.expiresAt < new Date()) {
    return { valid: false };
  }

  // If requesting specific club, verify API key has access
  if (requestedClubId && apiKey.clubId !== requestedClubId) {
    return { valid: false };
  }

  return {
    valid: true,
    clubId: apiKey.clubId,
    userId: apiKey.userId,
  };
}
```

**RowOps-specific concern:**
API keys grant programmatic access to club data. If validation is flawed, attacker can access any club's data by changing headers.

---

### 17. Stale JWT Claims After Role Changes

**What it is:**
JWT contains role claim that persists until token expiry even after role change in database.

**How it manifests:**
```typescript
// Admin demotes user: COACH → ATHLETE
await prisma.teamMember.update({
  where: { id: memberId },
  data: { role: 'ATHLETE' }
});

// User's JWT still has role=COACH for 1 hour
// Can still create practices until token expires
```

**Detection:**
```bash
# Check JWT expiry configuration
grep -r "JWT_EXPIRY" .env*

# Audit functions that trust JWT role without DB check
grep -r "claims.user_role" src/ | grep -v "prisma"
```

**How to fix:**

**Force token refresh on role changes:**
```typescript
export async function updateMemberRole(
  memberId: string,
  newRole: Role
) {
  // Update database
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { role: newRole }
  });

  // Invalidate session to force re-login
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { userId: true }
  });

  // Force JWT refresh (requires Supabase Admin API)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabaseAdmin.auth.admin.signOut(member.userId);
}
```

**Or always query database for current role:**
```typescript
export async function requireCoach() {
  const user = await requireAuth();

  // ❌ Don't trust JWT
  // const { claims } = await getUserClaims();
  // if (claims.user_role !== 'COACH') throw new Error('Unauthorized');

  // ✅ Query database for current role
  const member = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    select: { role: true }
  });

  if (member?.role !== 'COACH') {
    throw new Error('Unauthorized');
  }
}
```

**RowOps-specific scenarios:**
- Coach demoted to athlete — shouldn't edit lineups
- Facility admin removed — shouldn't manage equipment
- Club admin role revoked — shouldn't invite users

---

### 18. Missing `server-only` Directive on Sensitive Modules

**What it is:**
Database queries or secrets imported in Client Components due to missing `'server-only'` directive.

**How it manifests:**
```typescript
// lib/prisma.ts
export const prisma = new PrismaClient(); // ❌ No server-only directive

// components/PracticeCard.tsx
'use client'
import { prisma } from '@/lib/prisma'; // ❌ Webpack error or secret leak
```

**Detection:**
```bash
# Find modules without server-only
grep -L "server-only" src/lib/prisma.ts
grep -L "server-only" src/lib/supabase/server.ts
grep -L "server-only" src/lib/auth/*.ts
```

**How to fix:**

**Add `'server-only'` to sensitive modules:**
```typescript
// lib/prisma.ts
import 'server-only'; // ✅ Prevents client import

export const prisma = new PrismaClient();
```

**Install package:**
```bash
npm install server-only
```

**RowOps modules requiring `'server-only'`:**
- `src/lib/prisma.ts` — Database client
- `src/lib/supabase/server.ts` — Server-side Supabase
- `src/lib/auth/authorize.ts` — Authorization helpers
- `src/lib/auth/api-key.ts` — API key validation

**Sources:**
- [Next.js Data Security: Server-Only Code](https://nextjs.org/docs/app/guides/data-security#preventing-client-access-to-private-data)

---

### 19. Unvalidated Dynamic Route Parameters

**What it is:**
Dynamic route params (`[teamSlug]`, `[practiceId]`) used directly in queries without validation.

**How it manifests:**
```typescript
// app/[teamSlug]/practices/[practiceId]/page.tsx
export default async function PracticePage({ params }: {
  params: { teamSlug: string; practiceId: string }
}) {
  // ❌ No validation — could be SQL injection payload
  const practice = await prisma.practice.findUnique({
    where: { id: params.practiceId }  // Prisma protects SQL, but...
  });

  // ❌ No authorization — user may not be member of this team
  return <PracticeDetails practice={practice} />;
}
```

**Detection:**
```bash
# Find dynamic routes
find src/app -type d -name "\[*\]"

# Check if params are validated
grep -r "params\." src/app/\[* | grep -v "z\."
```

**How to fix:**

**Validate params and verify membership:**
```typescript
import { z } from 'zod';

const paramsSchema = z.object({
  teamSlug: z.string().regex(/^[a-z0-9-]+$/),
  practiceId: z.string().uuid(),
});

export default async function PracticePage({ params }: {
  params: { teamSlug: string; practiceId: string }
}) {
  // Validate format
  const validated = paramsSchema.parse(params);

  // Verify user has access via requireTeamBySlug
  const { user, team } = await requireTeamBySlug(validated.teamSlug);

  // Query with team constraint
  const practice = await prisma.practice.findFirst({
    where: {
      id: validated.practiceId,
      teamId: team.id  // ✅ Ensures practice belongs to user's team
    }
  });

  if (!practice) notFound();

  return <PracticeDetails practice={practice} />;
}
```

**RowOps routes to audit:**
- `/[teamSlug]/practices/[practiceId]`
- `/[teamSlug]/equipment/[equipmentId]`
- `/[teamSlug]/roster/[memberId]`
- `/join/[inviteCode]`

**Sources:**
- [Next.js Data Security: Validate Dynamic Route Parameters](https://nextjs.org/docs/app/guides/data-security#validating-input)

---

## Summary and Recommendations

### Immediate Actions (Critical)

1. **Upgrade Next.js** to 15.4.8+ or 16.0.12+ (CVE-2025-55182, CVE-2025-66478, CVE-2025-29927)
2. **Rotate all secrets** after patching React2Shell vulnerability
3. **Audit RLS policies** — ensure all tables have RLS enabled + policies
4. **Block `x-middleware-subrequest` header** at reverse proxy/CDN
5. **Switch Prisma from `postgres` user** to dedicated role OR use client extensions for tenant filtering

### High Priority (Critical but not exploited yet)

6. **Audit connection pool usage** — verify tenant context reset per transaction
7. **Add input validation** to all Server Actions with Zod
8. **Re-verify JWT claims** — query database for current membership, don't trust stale claims
9. **Check for service role key exposure** — scan codebase and git history

### Medium Priority (Moderate risk)

10. **Mirror CASL checks server-side** — client-side ability checks are UI-only
11. **Validate API key authorization** — ensure club context is verified
12. **Add CSRF protection** to custom Route Handlers
13. **Review Prisma queries** for operator injection vulnerabilities

### Low Priority (Easy wins)

14. **Add `'server-only'` directive** to sensitive modules
15. **Validate dynamic route params** with Zod
16. **Check RLS policy indexes** for performance
17. **Document stale JWT claim behavior** and force refresh on role changes

---

## Confidence Assessment

| Pitfall | Confidence | Verification |
|---------|-----------|--------------|
| React2Shell RCE | HIGH | Official CVE, Next.js advisory |
| Middleware Bypass | HIGH | Official CVE, Datadog analysis |
| RLS Not Enabled | HIGH | Supabase docs, 2025 breach reports |
| Prisma RLS Bypass | HIGH | Official Prisma discussion, community patterns |
| Connection Pool Contamination | HIGH | PostgreSQL CVEs 2024-2025 |
| Server Action Validation | HIGH | Next.js official security guide |
| JWT Claims Trust | HIGH | Supabase GitHub discussions |
| CASL Client-Only | MEDIUM | Community best practices |
| Service Role Exposure | MEDIUM | GitGuardian remediation guide |
| Cache Poisoning | MEDIUM | Official CVE-2025-49826 |
| JWT HS256 Migration | MEDIUM | Supabase migration docs |
| Race Conditions | MEDIUM | Multi-tenant architecture analysis |
| CSRF on Routes | LOW | Next.js docs |
| Operator Injection | LOW | Security research (Aikido) |
| Missing Indexes | LOW | Supabase performance docs |
| API Key Validation | LOW | Code audit (speculative) |
| Stale JWT Claims | LOW | JWT architecture understanding |
| server-only Missing | LOW | Next.js best practices |
| Dynamic Route Validation | LOW | Next.js security guide |

---

**Research complete. Ready for security audit execution.**
