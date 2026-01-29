# Phase 26: RBAC & Tenant Isolation - Research

**Researched:** 2026-01-28
**Domain:** Role-based access control, multi-tenant isolation, RLS policy validation
**Confidence:** HIGH

## Summary

Phase 26 audits the RBAC and tenant isolation systems that are already implemented. The codebase has a mature foundation: CASL for permission management, Supabase RLS for database-level isolation, and JWT claims for tenant context. This is a security audit phase, not a building phase - the goal is to verify that existing implementations meet security requirements and identify any gaps.

The research reveals that the current implementation is architecturally sound but has several areas requiring validation:
1. **RLS Coverage Gaps:** Many tables have RLS enabled but lack policies (Practice, Lineup, Season, etc.)
2. **CASL Enforcement Consistency:** Some API routes use `accessibleBy()`, others rely only on manual checks
3. **Role Propagation:** Effective roles include temporary grants, but JWT claims may be stale
4. **Facility-Shared Equipment:** Complex RLS hierarchy needs cross-tenant testing

**Primary recommendation:** Create comprehensive test suites using pgTAP for RLS policies and integration tests for CASL enforcement. The audit should verify existing implementations rather than building new features.

## Standard Stack

All infrastructure is already in place:

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @casl/ability | ^6.8.0 | Permission rules engine | Configured in ability.ts |
| @casl/prisma | ^1.6.1 | Prisma query integration | Used with accessibleBy() |
| @casl/react | ^5.0.1 | React integration | Can component + useAbility |
| Supabase RLS | PostgreSQL | Row-level security | Policies exist for most tables |
| jwt-decode | latest | JWT claims extraction | Used in claims.ts |

### Testing Tools (Need Setup)
| Tool | Purpose | Installation |
|------|---------|--------------|
| pgTAP | RLS policy testing | Supabase extension (enable in Dashboard) |
| supabase-test-helpers | Test user simulation | `CREATE EXTENSION IF NOT EXISTS "basejump-supabase_test_helpers"` |
| Vitest | Integration tests | Already in package.json |

**No new production dependencies required.**

## Architecture Patterns

### Current Permission Architecture

```
User Request
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│  getAuthContext()                                              │
│  - Validates JWT (getUser() first for security)                │
│  - Gets claims from session                                    │
│  - Looks up ClubMembership for current club                    │
│  - Merges temporary grants via getUserEffectiveRoles()         │
│  - Creates CASL ability via defineAbilityFor()                 │
└────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│  API Route Handler                                              │
│  - Check: context.ability.can('action', 'Subject')             │
│  - Query: accessibleBy(context.ability).Subject + business     │
│  - Return: Filtered data                                       │
└────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────┐
│  Prisma Query (via Supabase)                                   │
│  - RLS policies filter at database level                       │
│  - JWT claims checked: get_current_facility_id(),              │
│    get_current_club_id(), has_role()                          │
└────────────────────────────────────────────────────────────────┘
```

### Pattern 1: Double-Layered Authorization (Current)

**What:** CASL checks at application layer + RLS at database layer
**Implementation:** Already in place

```typescript
// Source: /home/hb/rowops/src/app/api/practices/route.ts

// Layer 1: CASL permission check
if (!context.ability.can('create', 'Practice')) {
  return forbiddenResponse('You do not have permission to create practices');
}

// Layer 2: accessibleBy filters queries
const practices = await prisma.practice.findMany({
  where: {
    AND: [
      accessibleBy(context.ability).Practice,  // CASL conditions
      where,                                    // Business logic
    ],
  },
});

// Layer 3: RLS at database (transparent)
// get_current_club_id() filters if policies exist
```

### Pattern 2: Role Definition (No-Inheritance RBAC)

**What:** Each role grants explicit permissions; no implicit inheritance
**Why:** FACILITY_ADMIN managing shared equipment but not creating lineups

```typescript
// Source: /home/hb/rowops/src/lib/permissions/ability.ts

// FACILITY_ADMIN cannot create lineups without COACH role
if (user.roles.includes('FACILITY_ADMIN')) {
  can('read', 'Practice');
  can('read', 'Lineup');
  // NOTE: Cannot create/update lineups, practices - must also have COACH role
}

// COACH explicitly gets lineup management
if (user.roles.includes('COACH')) {
  can('manage', 'Practice', { teamId: user.clubId });
  can('manage', 'Lineup');  // Full lineup control
}
```

### Pattern 3: JWT Claims for RLS Context

**What:** Custom access token hook injects tenant IDs into JWT
**Implementation:** Already in place via 00006_facility_access_token_hook.sql

```sql
-- Claims added to JWT:
-- facility_id: UUID of user's facility
-- club_id: UUID of user's current club
-- user_roles: Array of roles ['COACH', 'ATHLETE']

-- RLS helper functions read these claims:
CREATE FUNCTION public.get_current_facility_id() RETURNS text AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'facility_id')
$$;
```

### Anti-Patterns Found in Audit

1. **Missing RLS Policies:** Tables with RLS enabled but no policies (blocks all access):
   - Practice, PracticeBlock, Season, Lineup, SeatAssignment
   - Regatta, Entry, EntryLineup, EntrySeat
   - ClubMembership, AuditLog, ApiKey, PermissionGrant

2. **Inconsistent accessibleBy Usage:** Some routes use it, some don't:
   - Uses accessibleBy: practices, lineups, audit-logs, equipment
   - Missing accessibleBy: Most other routes (need audit)

3. **PARENT Role Incomplete:** `linkedAthleteIds` is always empty array:
   ```typescript
   // Source: /home/hb/rowops/src/lib/auth/get-auth-context.ts
   if (roles.includes('PARENT')) {
     // TODO: Query ParentAthleteLink table when it exists
     linkedAthleteIds = [];  // <-- Always empty!
   }
   ```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RLS policy testing | Manual SQL queries | pgTAP + supabase-test-helpers | Standardized test format, CI integration |
| Cross-tenant testing | Ad-hoc queries | tests.authenticate_as() helper | Proper session simulation |
| Permission testing | Manual API calls | Vitest + getAuthContext mock | Reproducible, automated |
| Negative claim verification | grep for missing policies | pg_policies system view | Authoritative source |

**Key insight:** pgTAP and Supabase test helpers provide proven patterns for RLS testing. Manual verification is error-prone and not repeatable.

## Common Pitfalls

### Pitfall 1: Tables with RLS Enabled but No Policies

**What goes wrong:** RLS enabled without policies blocks ALL access (including service role in some cases)
**Current state:** Many tables have RLS enabled but no policies defined

**Tables missing policies (from Prisma schema analysis):**
- Practice, PracticeBlock, PracticeTemplate, TemplateBlock, BlockTemplate
- Season, AthleteEligibility
- Lineup, SeatAssignment, LineupTemplate, TemplateSeat, LandAssignment
- Workout, WorkoutInterval, WorkoutTemplate, WorkoutTemplateInterval
- Regatta, Entry, EntryLineup, EntrySeat, NotificationConfig
- EquipmentUsageLog, EquipmentBooking
- ClubMembership, AuditLog, ApiKey, MfaBackupCode
- PermissionGrant, SsoConfig, PushSubscription
- Announcement, AnnouncementRead
- RegattaCentralConnection

**How to verify:**
```sql
-- Find tables with RLS enabled but no policies
SELECT schemaname, tablename
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.tablename
    AND p.schemaname = t.schemaname
  );
```

**How to fix:** Either add policies OR queries must use service role (bypasses RLS)

### Pitfall 2: CASL accessibleBy Throws on No Permission

**What goes wrong:** `accessibleBy(ability).Subject` throws ForbiddenError if user has zero access rules for that subject
**Current handling:** Routes wrap in try/catch, return empty array

```typescript
// Source: /home/hb/rowops/src/app/api/practices/route.ts
try {
  const practices = await prisma.practice.findMany({
    where: {
      AND: [accessibleBy(context.ability).Practice, where],
    },
  });
} catch (e) {
  if (e instanceof ForbiddenError) {
    return NextResponse.json({ practices: [] });  // Graceful empty
  }
  throw e;
}
```

**Warning signs:** Routes without this pattern may crash instead of returning 403

### Pitfall 3: JWT Claims Stale After Role Change

**What goes wrong:** User's role is changed, but JWT still has old role until token refresh
**Why it happens:** JWT claims set at login, not updated on role change

**Current mitigation:** Database lookup in getAuthContext (good):
```typescript
// Source: /home/hb/rowops/src/lib/auth/claims.ts
// Get effective roles including any temporary grants
const effectiveRoles = await getUserEffectiveRoles(
  user.id,
  clubId,
  membership.roles as Role[]
);
```

**Requirement RBAC-07:** "Role changes propagate immediately to permissions"
**Status:** ALREADY IMPLEMENTED via database lookup, not JWT-only

### Pitfall 4: Facility-Shared Equipment Complex RLS

**What goes wrong:** Club A's coach can see/modify Club B's shared equipment
**Current policy:** (00008_facility_rls_policies.sql lines 118-133)

```sql
-- CLUB-owned (shared): visible to all facility members
("ownerType" = 'CLUB' AND "isShared" = true AND "facilityId" = public.get_current_facility_id())
```

**Risk:** Policy allows READ for all facility members but UPDATE/DELETE only for owning club. Need to verify cross-club write attempts fail.

### Pitfall 5: Missing PARENT Athlete Linking

**What goes wrong:** PARENT role has no way to be linked to specific athletes
**Current state:** `linkedAthleteIds` always empty, ParentAthleteLink table doesn't exist

**Impact on requirements:**
- RBAC-05: "PARENT can only view their linked athlete's data" - CANNOT PASS without athlete linking
- Need to either: create ParentAthleteLink table OR store in ClubMembership metadata

## Code Examples

### Verifying RLS is Enabled

```sql
-- Check RLS status on all tables
SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
```

### pgTAP Test for Cross-Tenant Isolation

```sql
-- Source: Adapted from Supabase test helpers documentation
-- https://usebasejump.com/blog/testing-on-supabase-with-pgtap

BEGIN;
SELECT plan(3);

-- Setup: Create test users in different tenants
SELECT tests.create_supabase_user('user_a', 'usera@example.com');
SELECT tests.create_supabase_user('user_b', 'userb@example.com');

-- Create ClubMembership for each user
INSERT INTO "ClubMembership" (id, "clubId", "userId", roles, "isActive")
VALUES
  (gen_random_uuid(), 'club-a-id', tests.get_supabase_uid('user_a'), '{COACH}', true),
  (gen_random_uuid(), 'club-b-id', tests.get_supabase_uid('user_b'), '{COACH}', true);

-- Test 1: User A can see their own club's practices
SELECT tests.authenticate_as('user_a');
SELECT ok(
  (SELECT COUNT(*) FROM "Practice" WHERE "teamId" = 'club-a-id') >= 0,
  'User A can query their own practices'
);

-- Test 2: User A cannot see User B's practices (cross-tenant isolation)
SELECT is_empty(
  $$ SELECT * FROM "Practice" WHERE "teamId" = 'club-b-id' $$,
  'User A cannot see Club B practices'
);

-- Test 3: User A cannot insert into Club B
SELECT throws_ok(
  $$ INSERT INTO "Practice" ("id", "teamId", "seasonId", "name", "date", "startTime", "endTime", "status")
     VALUES (gen_random_uuid(), 'club-b-id', 'season-id', 'Test', NOW(), NOW(), NOW() + interval '1 hour', 'DRAFT') $$,
  '42501',  -- RLS violation error code
  'User A cannot insert into Club B'
);

SELECT tests.clear_authentication();
SELECT * FROM finish();
ROLLBACK;
```

### CASL Enforcement Test Pattern

```typescript
// Source: Pattern for Vitest integration tests
import { describe, it, expect } from 'vitest';
import { defineAbilityFor } from '@/lib/permissions/ability';

describe('RBAC-02: CLUB_ADMIN permissions', () => {
  it('can manage own club settings', () => {
    const ability = defineAbilityFor({
      userId: 'user-1',
      clubId: 'club-a',
      roles: ['CLUB_ADMIN'],
      viewMode: 'club',
    });

    expect(ability.can('manage', 'Team', { id: 'club-a' })).toBe(true);
  });

  it('cannot manage other clubs', () => {
    const ability = defineAbilityFor({
      userId: 'user-1',
      clubId: 'club-a',
      roles: ['CLUB_ADMIN'],
      viewMode: 'club',
    });

    expect(ability.can('manage', 'Team', { id: 'club-b' })).toBe(false);
  });

  it('cannot create lineups without COACH role', () => {
    const ability = defineAbilityFor({
      userId: 'user-1',
      clubId: 'club-a',
      roles: ['CLUB_ADMIN'],  // No COACH
      viewMode: 'club',
    });

    expect(ability.can('create', 'Lineup')).toBe(false);
  });
});

describe('RBAC-01: FACILITY_ADMIN permissions', () => {
  it('cannot create lineups without COACH role', () => {
    const ability = defineAbilityFor({
      userId: 'user-1',
      clubId: 'club-a',
      facilityId: 'facility-a',
      roles: ['FACILITY_ADMIN'],  // No COACH
      viewMode: 'facility',
    });

    expect(ability.can('create', 'Lineup')).toBe(false);
    expect(ability.can('create', 'Practice')).toBe(false);
  });
});
```

### API Route Permission Verification

```typescript
// Source: Pattern for testing API routes
import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/practices/route';
import { NextRequest } from 'next/server';

// Mock getAuthContext to return specific role
vi.mock('@/lib/auth/get-auth-context', () => ({
  getAuthContext: vi.fn(),
}));

describe('RBAC-03: COACH can create practices', () => {
  it('allows COACH to create practice', async () => {
    const { getAuthContext } = await import('@/lib/auth/get-auth-context');
    (getAuthContext as any).mockResolvedValue({
      success: true,
      context: {
        userId: 'user-1',
        clubId: 'club-a',
        roles: ['COACH'],
        ability: defineAbilityFor({
          userId: 'user-1',
          clubId: 'club-a',
          roles: ['COACH'],
          viewMode: 'club',
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/practices', {
      method: 'POST',
      body: JSON.stringify({
        seasonId: 'season-1',
        name: 'Test Practice',
        date: '2026-02-01',
        startTime: '2026-02-01T06:00:00Z',
        endTime: '2026-02-01T08:00:00Z',
        blocks: [{ type: 'WATER' }],
      }),
    });

    const response = await POST(request);
    expect(response.status).not.toBe(403);
  });

  it('denies ATHLETE from creating practice', async () => {
    const { getAuthContext } = await import('@/lib/auth/get-auth-context');
    (getAuthContext as any).mockResolvedValue({
      success: true,
      context: {
        userId: 'user-1',
        clubId: 'club-a',
        roles: ['ATHLETE'],
        ability: defineAbilityFor({
          userId: 'user-1',
          clubId: 'club-a',
          roles: ['ATHLETE'],
          viewMode: 'club',
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/practices', {
      method: 'POST',
      body: JSON.stringify({ /* ... */ }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });
});
```

## State of the Art

| Old Approach | Current Approach | Status in Codebase |
|--------------|------------------|-------------------|
| Single role per user | Multiple roles array (ClubMembership.roles) | IMPLEMENTED |
| Client-only permission checks | Double-layer (CASL + RLS) | PARTIALLY IMPLEMENTED |
| Static permissions | Temporary grants with expiration | IMPLEMENTED (PermissionGrant) |
| JWT-only roles | Database lookup for current roles | IMPLEMENTED |
| Team-level isolation | Facility/Club/Team hierarchy | IMPLEMENTED |

**Recent security concerns (2026):**
- [CVE-2024-10976](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c): PostgreSQL RLS bypass in subqueries (patch available)
- [CVE-2025-8713](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c): RLS information leak via optimizer statistics
- CASL accessibleBy requires explicit ForbiddenError handling

## Gap Analysis: Requirements vs Implementation

### RBAC Requirements Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| RBAC-01: FACILITY_ADMIN facility-level only | NEEDS TEST | Ability defined, needs verification |
| RBAC-02: CLUB_ADMIN own club only | NEEDS TEST | Ability defined with clubId condition |
| RBAC-03: COACH manage practices/equipment | NEEDS TEST | Ability defined, accessibleBy used |
| RBAC-04: ATHLETE view own schedule | NEEDS TEST | Ability defined, status filter needed |
| RBAC-05: PARENT linked athlete only | BLOCKED | ParentAthleteLink table missing |
| RBAC-06: CASL server-side enforcement | PARTIAL | Some routes missing accessibleBy |
| RBAC-07: Immediate role propagation | IMPLEMENTED | Database lookup in getAuthContext |

### Isolation Requirements Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| ISOL-01: All tables have RLS | PARTIAL | Many tables missing policies |
| ISOL-02: RLS filters by tenant | PARTIAL | Existing policies correct, coverage gap |
| ISOL-03: Cross-tenant blocked | NEEDS TEST | Need pgTAP tests |
| ISOL-04: JWT claims match access | IMPLEMENTED | custom_access_token_hook |
| ISOL-05: Prisma includes tenant filter | PARTIAL | accessibleBy not universal |
| ISOL-06: No data leak in responses | NEEDS TEST | Manual audit required |

## Tables Requiring RLS Policies

**Critical (contain tenant data, have RLS enabled, need policies):**
1. Practice - needs teamId filter
2. PracticeBlock - needs practice.teamId filter (via join)
3. Season - needs teamId filter
4. Lineup - needs block.practice.teamId filter (via joins)
5. SeatAssignment - needs lineup.block.practice.teamId filter
6. Regatta - needs teamId filter
7. Entry - needs regatta.teamId filter
8. ClubMembership - needs clubId + userId filter (sensitive)
9. AuditLog - needs clubId filter
10. ApiKey - needs clubId filter
11. PermissionGrant - needs clubId filter
12. Announcement - needs teamId filter

**Lower priority (lookup or read-only tables):**
- PracticeTemplate, TemplateBlock, BlockTemplate
- LineupTemplate, TemplateSeat, LandAssignment
- Workout, WorkoutInterval, WorkoutTemplate, WorkoutTemplateInterval
- EntryLineup, EntrySeat, NotificationConfig
- EquipmentUsageLog, EquipmentBooking
- MfaBackupCode, SsoConfig, PushSubscription
- AnnouncementRead, RegattaCentralConnection

## Open Questions

1. **ParentAthleteLink Table:**
   - What we know: PARENT role exists, linkedAthleteIds expected
   - What's unclear: Schema for linking parents to athletes
   - Recommendation: Create ParentAthleteLink(id, parentUserId, athleteProfileId, relationship, verified)

2. **Service Role Usage for Tables Without Policies:**
   - What we know: Many tables have RLS enabled but no policies
   - What's unclear: Are queries using service role (bypassing RLS)?
   - Recommendation: Audit all Prisma clients to verify authenticated vs service role usage

3. **Cross-Club Equipment Booking:**
   - What we know: EquipmentBooking references clubId and equipmentId
   - What's unclear: Can club A book facility equipment? Club B's shared equipment?
   - Recommendation: Define booking permissions in RLS, test scenarios

4. **Audit Log Immutability:**
   - What we know: AuditLog model exists, INSERT-only expected
   - What's unclear: RLS policy to prevent UPDATE/DELETE
   - Recommendation: Create policy allowing INSERT only, no UPDATE/DELETE

## Sources

### Primary (HIGH confidence)
- Codebase analysis: /home/hb/rowops/src/lib/permissions/ability.ts
- Codebase analysis: /home/hb/rowops/src/lib/auth/claims.ts
- Codebase analysis: /home/hb/rowops/src/lib/auth/get-auth-context.ts
- Codebase analysis: /home/hb/rowops/supabase/migrations/00002_rls_policies.sql
- Codebase analysis: /home/hb/rowops/supabase/migrations/00005_facility_rls_helpers.sql
- Codebase analysis: /home/hb/rowops/supabase/migrations/00008_facility_rls_policies.sql
- [CASL Prisma Documentation](https://casl.js.org/v6/en/package/casl-prisma/)
- [Supabase RLS Testing with pgTAP](https://supabase.com/docs/guides/local-development/testing/pgtap-extended)

### Secondary (MEDIUM confidence)
- [Basejump Supabase Test Helpers](https://usebasejump.com/blog/testing-on-supabase-with-pgtap)
- [Multi-Tenant RLS Security Concerns 2026](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Prisma Row-Level Security Guide](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security)

### Tertiary (LOW confidence)
- WebSearch results on CASL testing patterns (general guidance, needs validation)

## Metadata

**Confidence breakdown:**
- Current implementation analysis: HIGH - Direct code review
- RLS gap identification: HIGH - Schema vs policy comparison
- Testing patterns: MEDIUM - Adapted from official docs, needs validation
- PARENT role implementation: LOW - Requires design decision

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days)
