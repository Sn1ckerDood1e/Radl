# Phase 12: Facility Schema Migration - Research

**Researched:** 2026-01-23
**Domain:** Multi-tenant database schema, PostgreSQL RLS, Prisma migrations, facility hierarchy
**Confidence:** HIGH

## Summary

This phase introduces a 3-level tenant hierarchy (Facility -> Club -> Team) with backward-compatible equipment ownership to an existing Next.js 16 + Prisma 6 + Supabase codebase. The existing system has a flat team-based structure with RLS policies using JWT claims via `auth.uid()` and helper functions. Phase 12 must migrate all existing Team-based data to the new hierarchy while ensuring zero data leaks through RLS and maintaining backward compatibility for existing single-team installations.

The key challenge is enforcing tenant isolation with connection pooling (Supabase Supavisor in transaction mode). Two approaches are viable:

1. **JWT Claims (Recommended):** Extend Custom Access Token Hook to include `facility_id` and `club_id`. RLS policies use `current_setting('request.jwt.claims', true)::jsonb`. Connection-safe because JWT travels with request.

2. **Session Variables with LOCAL:** Use Prisma Client Extension to wrap queries in transactions that call `set_config('app.current_facility_id', ..., TRUE)`. The `TRUE` (LOCAL) flag ensures settings reset after transaction, preventing cross-request leaks.

**Primary recommendation:** Use JWT claims for tenant context in RLS policies (matches existing pattern with `auth.uid()`). Implement the expand-migrate-contract pattern for schema migration. Create defense-in-depth with both CASL and RLS.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.x | ORM and migrations | Already in use, supports custom SQL migrations |
| @supabase/ssr | ^0.x | Auth cookie handling | Already in use for JWT claims |
| jwt-decode | ^4.0.0 | JWT parsing | Already in use in claims.ts |

### Supporting (No New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase SQL Editor | N/A | RLS policy creation | Run migration SQL after Prisma migrate |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JWT claims for RLS | Session variables (set_config) | JWT is already used in existing RLS, simpler; session vars require Prisma extension wrapper |
| Expand-migrate-contract | Big bang migration | Expand-migrate-contract allows rollback, big bang is risky |
| CASL + RLS (defense-in-depth) | RLS only | CASL catches bugs before they hit DB, RLS is last line of defense |

**Installation:**
```bash
# No new packages needed - use existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
prisma/
├── schema.prisma           # Updated with Facility model
supabase/
├── migrations/
│   ├── 00005_facility_schema.sql      # Schema changes
│   ├── 00006_facility_data_migration.sql  # Data migration
│   └── 00007_facility_rls.sql         # RLS policies
src/
├── lib/
│   ├── auth/
│   │   ├── claims.ts       # Extended for facility_id, club_id
│   │   └── facility-context.ts  # NEW: Facility context helpers
│   └── permissions/
│       └── ability.ts      # Extended for facility-scoped permissions
```

### Pattern 1: JWT Claims for Tenant Context (Recommended)

**What:** Extend Custom Access Token Hook to include facility_id and club_id in JWT claims
**When to use:** All RLS policies that need tenant context
**Why:** Connection-pooling safe - JWT claims travel with the request, not the connection

```sql
-- supabase/migrations/00008_updated_access_token_hook.sql
-- Updated Custom Access Token Hook for Facility Hierarchy

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_facility_id uuid;
  user_club_id uuid;
  user_team_id uuid;
  user_roles text[];
BEGIN
  -- Get user's current context from ClubMembership + Team (Club) -> Facility
  SELECT
    t."facilityId",
    cm."clubId",
    cm."clubId",  -- club_id = team_id for backward compatibility
    cm.roles
  INTO user_facility_id, user_club_id, user_team_id, user_roles
  FROM public."ClubMembership" cm
  JOIN public."Team" t ON t.id = cm."clubId"
  WHERE cm."userId" = (event->>'user_id')
    AND cm."isActive" = true
  LIMIT 1;

  claims := event->'claims';

  -- Add facility/club/team claims
  IF user_facility_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{facility_id}', to_jsonb(user_facility_id::text));
  ELSE
    claims := jsonb_set(claims, '{facility_id}', 'null');
  END IF;

  IF user_club_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{club_id}', to_jsonb(user_club_id::text));
    claims := jsonb_set(claims, '{team_id}', to_jsonb(user_team_id::text));  -- Legacy compat
  ELSE
    claims := jsonb_set(claims, '{club_id}', 'null');
    claims := jsonb_set(claims, '{team_id}', 'null');
  END IF;

  IF user_roles IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_roles}', to_jsonb(user_roles));
  ELSE
    claims := jsonb_set(claims, '{user_roles}', '[]'::jsonb);
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to supabase_auth_admin (required for hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

### Pattern 2: RLS Helper Functions with JWT Claims

**What:** Create helper functions that extract tenant context from JWT claims
**When to use:** RLS policies referencing tenant context
**Why:** Consistent, performant access to tenant context

```sql
-- Helper functions for RLS policies

-- Get facility_id from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_facility_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'facility_id'),
    ''
  )::uuid
$$;

-- Get club_id from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_club_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'club_id'),
    ''
  )::uuid
$$;

-- Check if user has role in current context
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT required_role = ANY(
    ARRAY(
      SELECT jsonb_array_elements_text(
        current_setting('request.jwt.claims', true)::jsonb -> 'user_roles'
      )
    )
  )
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_current_facility_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_club_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
```

### Pattern 3: Hierarchical RLS Policies

**What:** RLS policies that check facility/club/team hierarchy
**When to use:** Tables that need tenant isolation

```sql
-- Equipment can be owned at facility, club, or team level
CREATE POLICY "equipment_select" ON "Equipment"
  FOR SELECT
  TO authenticated
  USING (
    CASE "ownerType"
      -- Facility-owned: visible to all clubs in facility
      WHEN 'FACILITY' THEN "facilityId" = (SELECT public.get_current_facility_id())
      -- Club-owned: visible to club members
      WHEN 'CLUB' THEN "clubId" = (SELECT public.get_current_club_id())
      -- Team-owned (legacy): visible to team members
      WHEN 'TEAM' THEN "teamId" = (SELECT public.get_current_club_id())
      -- NULL ownerType (legacy data before migration)
      ELSE "teamId" = (SELECT public.get_current_club_id())
    END
    -- Shared equipment: also visible if explicitly shared with facility
    OR (
      "isShared" = TRUE
      AND "facilityId" = (SELECT public.get_current_facility_id())
    )
  );

-- Club-scoped data: only visible within club
CREATE POLICY "practice_select" ON "Practice"
  FOR SELECT
  TO authenticated
  USING ("teamId" = (SELECT public.get_current_club_id()));
```

### Pattern 4: Expand-Migrate-Contract for Schema Migration

**What:** Multi-step migration that maintains backward compatibility
**When to use:** Adding required columns to existing tables with data

**Step 1: Expand (add optional columns)**
```prisma
// schema.prisma - Step 1
model Equipment {
  // ... existing fields
  teamId     String   // Existing - keep for backward compat
  facilityId String?  // NEW: Optional during migration
  clubId     String?  // NEW: Optional during migration
  ownerType  EquipmentOwnerType? // NEW: Optional during migration
  isShared   Boolean  @default(false)  // NEW: For facility equipment sharing
}

enum EquipmentOwnerType {
  FACILITY
  CLUB
  TEAM
}
```

**Step 2: Migrate (populate new columns)**
```sql
-- All existing equipment becomes TEAM-owned initially
UPDATE "Equipment"
SET
  "ownerType" = 'TEAM',
  "clubId" = "teamId",
  "isShared" = false
WHERE "ownerType" IS NULL;

-- Create facility wrapper for existing teams
INSERT INTO "Facility" (id, name, slug, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  t.name,
  t.slug,
  t."createdAt",
  NOW()
FROM "Team" t
WHERE NOT EXISTS (SELECT 1 FROM "Facility" f WHERE f.slug = t.slug);

-- Link teams to their facility wrapper
UPDATE "Team" t
SET "facilityId" = f.id
FROM "Facility" f
WHERE f.slug = t.slug
  AND t."facilityId" IS NULL;
```

**Step 3: Contract (make columns required - DEFERRED)**
Contract phase is deferred to Phase 17 completion to ensure rollback capability.

### Pattern 5: Defense-in-Depth (CASL + RLS)

**What:** Application-level CASL checks + database-level RLS policies
**When to use:** All data access paths

```typescript
// Server-side: CASL ability check BEFORE query
if (!ability.can('read', 'Equipment')) {
  throw new ForbiddenError('Cannot access equipment');
}

// Query - RLS also enforces tenant isolation at DB level
const equipment = await prisma.equipment.findMany({
  where: {
    AND: [
      accessibleBy(ability).Equipment,
      // RLS automatically filters by tenant
    ]
  }
});
```

**Why:** If CASL has a bug, RLS catches it. If RLS has a bug, CASL catches it.

### Anti-Patterns to Avoid

- **Session variables without LOCAL flag:** Variables persist on connection and leak to other requests in pooled environment
- **Trusting user-supplied facility_id/club_id:** Always derive tenant context from JWT claims or verified cookie
- **Big bang migration:** Cannot rollback; use expand-migrate-contract
- **RLS-only without CASL:** Bugs in policies cause data leaks with no application-level safety net
- **Removing existing teamId columns:** Keep for backward compatibility, add new columns alongside

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant context in RLS | Session variables with pooling | JWT claims | JWT travels with request, not connection |
| Schema migration with data | Single ALTER | Expand-migrate-contract | Allows rollback, maintains compatibility |
| Multi-level RLS | Complex inline CASE | Helper functions | Readable, testable, maintainable |
| Data isolation | Application WHERE clauses only | RLS + CASL | Defense-in-depth catches bugs |
| UUID generation | Custom function | gen_random_uuid() | PostgreSQL built-in, secure |

**Key insight:** Connection pooling fundamentally changes how tenant context works. Session-level state without LOCAL flag is dangerous with shared connections. JWT claims are immutable per request and travel with the user, not the connection.

## Common Pitfalls

### Pitfall 1: Session Variable Leakage in Transaction Mode
**What goes wrong:** `set_config('app.tenant_id', ...)` without LOCAL flag persists on connection, leaks to next request
**Why it happens:** Supavisor transaction mode shares connections between clients
**How to avoid:** Either use JWT claims (recommended) or use `set_config(..., TRUE)` with LOCAL flag
**Warning signs:** Intermittent wrong-tenant data in logs, "ghost" data appearing

### Pitfall 2: RLS Performance with Joins
**What goes wrong:** RLS policy joins to membership table on every row
**Why it happens:** Policy like `EXISTS (SELECT 1 FROM ClubMembership WHERE ...)` runs per row
**How to avoid:** Use JWT claims with indexed column comparison: `club_id = (SELECT get_current_club_id())`
**Warning signs:** Slow queries on large tables, explain plan shows nested loops

### Pitfall 3: Migration Leaving Null facilityId
**What goes wrong:** Existing data has NULL facility_id after migration
**Why it happens:** Forgot data migration step, or migration ran before facility wrapper creation
**How to avoid:** Migration script: 1) Create facility wrappers, 2) Update foreign keys, 3) Validate no NULLs
**Warning signs:** NOT NULL constraint violations, RLS policies blocking all access

### Pitfall 4: Custom Access Token Hook Not Refreshing
**What goes wrong:** User joins new facility but JWT still has old facility_id
**Why it happens:** JWTs are immutable until token refresh (1 hour default)
**How to avoid:** Database fallback in claims.ts (already exists), or force token refresh on context change
**Warning signs:** "No access" errors immediately after joining facility, works after re-login

### Pitfall 5: Breaking Existing RLS Policies
**What goes wrong:** Adding facility_id to policies breaks existing team-only data
**Why it happens:** Policy expects facility_id but existing data has NULL
**How to avoid:** Use COALESCE in policies, or ensure all data migrated before policy change
**Warning signs:** All data suddenly inaccessible, permission denied errors

### Pitfall 6: Forgetting Supabase SQL Migrations
**What goes wrong:** Prisma migrate runs but RLS policies not updated
**Why it happens:** RLS policies are raw SQL, not in Prisma schema
**How to avoid:** Supabase migrations run separately after Prisma migrate
**Warning signs:** Data visible that should be hidden, or no data visible at all

## Code Examples

### Facility Model Schema

```prisma
// prisma/schema.prisma additions

// Facility model (boathouse/organization level)
model Facility {
  id           String   @id @default(uuid())
  name         String
  slug         String   @unique
  // Location
  address      String?
  city         String?
  state        String?
  country      String?  @default("US")
  timezone     String   @default("America/New_York")
  coordinates  Json?    // { lat: number, lng: number }
  // Contact
  phone        String?
  email        String?
  website      String?
  // Branding
  logoUrl      String?
  description  String?
  // Billing (hybrid model)
  billingType  BillingType @default(FACILITY)
  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  clubs         Team[]   @relation("FacilityClubs")  // Team acts as Club
  equipment     Equipment[]  @relation("FacilityEquipment")
  memberships   FacilityMembership[]

  @@index([slug])
}

enum BillingType {
  FACILITY   // Facility pays for all clubs
  CLUB       // Each club has own subscription
  HYBRID     // Mix - some clubs pay, some don't
}

enum EquipmentOwnerType {
  FACILITY  // Shared across facility (boathouse boats)
  CLUB      // Club-exclusive (club-owned boats)
  TEAM      // Legacy team-owned (backward compat)
}

// Update Team model to add facility relationship
model Team {
  // ... existing fields
  facilityId String?  // NEW: nullable for backward compat

  facility Facility? @relation("FacilityClubs", fields: [facilityId], references: [id])

  @@index([facilityId])
}

// Update Equipment model with ownership hierarchy
model Equipment {
  // ... existing fields
  teamId     String?  // Keep for legacy, make optional
  // NEW: Ownership hierarchy
  ownerType  EquipmentOwnerType @default(TEAM)
  facilityId String?
  clubId     String?
  isShared   Boolean  @default(false)

  facility   Facility? @relation("FacilityEquipment", fields: [facilityId], references: [id])
  club       Team?     @relation("ClubEquipment", fields: [clubId], references: [id])
  team       Team?     @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@index([facilityId])
  @@index([clubId])
  @@index([ownerType])
}

// FacilityMembership for facility-level roles
model FacilityMembership {
  id           String   @id @default(uuid())
  facilityId   String
  userId       String
  roles        Role[]   // FACILITY_ADMIN only at this level
  isActive     Boolean  @default(true)
  joinedAt     DateTime @default(now())
  updatedAt    DateTime @updatedAt

  facility     Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)

  @@unique([facilityId, userId])
  @@index([userId])
  @@index([facilityId])
}
```

### Extended Claims Interface

```typescript
// src/lib/auth/claims.ts - Extended interface
export interface CustomJwtPayload {
  sub: string;
  email: string;
  // Facility hierarchy (NEW)
  facility_id: string | null;
  club_id: string | null;
  // Legacy - kept for backward compatibility
  team_id: string | null;
  user_role: 'COACH' | 'ATHLETE' | 'PARENT' | null;
  // New multi-role support
  user_roles?: string[];
}
```

### Facility Context Helper

```typescript
// src/lib/auth/facility-context.ts - NEW
import { cookies } from 'next/headers';

export const FACILITY_COOKIE_NAME = 'radl_current_facility';
const FACILITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function getCurrentFacilityId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(FACILITY_COOKIE_NAME)?.value ?? null;
}

export async function setCurrentFacilityId(facilityId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(FACILITY_COOKIE_NAME, facilityId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: FACILITY_COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearCurrentFacilityId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(FACILITY_COOKIE_NAME);
}
```

### RLS Policies for Facility Hierarchy

```sql
-- supabase/migrations/00007_facility_rls.sql

-- Enable RLS on Facility table
ALTER TABLE "Facility" ENABLE ROW LEVEL SECURITY;

-- Facility: Users see facilities they're members of
CREATE POLICY "facility_select" ON "Facility"
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT public.get_current_facility_id())
    OR EXISTS (
      SELECT 1 FROM "FacilityMembership" fm
      WHERE fm."facilityId" = "Facility".id
        AND fm."userId" = auth.uid()::text
        AND fm."isActive" = true
    )
    OR EXISTS (
      SELECT 1 FROM "ClubMembership" cm
      JOIN "Team" t ON t.id = cm."clubId"
      WHERE t."facilityId" = "Facility".id
        AND cm."userId" = auth.uid()::text
        AND cm."isActive" = true
    )
  );

-- Equipment: Hierarchical visibility with ownership types
DROP POLICY IF EXISTS "equipment_select" ON "Equipment";

CREATE POLICY "equipment_select" ON "Equipment"
  FOR SELECT
  TO authenticated
  USING (
    -- Legacy: team-owned (ownerType NULL or TEAM)
    (
      ("ownerType" IS NULL OR "ownerType" = 'TEAM')
      AND "teamId" = (SELECT public.get_current_club_id())
    )
    -- Club-owned: visible to club members
    OR (
      "ownerType" = 'CLUB'
      AND "clubId" = (SELECT public.get_current_club_id())
    )
    -- Facility-owned: visible to all facility members
    OR (
      "ownerType" = 'FACILITY'
      AND "facilityId" = (SELECT public.get_current_facility_id())
    )
    -- Club equipment shared with facility
    OR (
      "ownerType" = 'CLUB'
      AND "isShared" = true
      AND "clubId" IN (
        SELECT t.id FROM "Team" t
        WHERE t."facilityId" = (SELECT public.get_current_facility_id())
      )
    )
  );

-- Equipment: Insert policy
DROP POLICY IF EXISTS "equipment_insert" ON "Equipment";

CREATE POLICY "equipment_insert" ON "Equipment"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Club/team equipment: must be current club
    (
      ("ownerType" IN ('CLUB', 'TEAM') OR "ownerType" IS NULL)
      AND ("clubId" = (SELECT public.get_current_club_id())
           OR "teamId" = (SELECT public.get_current_club_id()))
    )
    -- Facility equipment: must be current facility and have FACILITY_ADMIN role
    OR (
      "ownerType" = 'FACILITY'
      AND "facilityId" = (SELECT public.get_current_facility_id())
      AND public.has_role('FACILITY_ADMIN')
    )
  );

-- Equipment: Update policy
DROP POLICY IF EXISTS "equipment_update" ON "Equipment";

CREATE POLICY "equipment_update" ON "Equipment"
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update own club's equipment
    (
      ("ownerType" IN ('CLUB', 'TEAM') OR "ownerType" IS NULL)
      AND ("clubId" = (SELECT public.get_current_club_id())
           OR "teamId" = (SELECT public.get_current_club_id()))
    )
    -- Facility admins can update facility equipment
    OR (
      "ownerType" = 'FACILITY'
      AND "facilityId" = (SELECT public.get_current_facility_id())
      AND public.has_role('FACILITY_ADMIN')
    )
  )
  WITH CHECK (
    (
      ("ownerType" IN ('CLUB', 'TEAM') OR "ownerType" IS NULL)
      AND ("clubId" = (SELECT public.get_current_club_id())
           OR "teamId" = (SELECT public.get_current_club_id()))
    )
    OR (
      "ownerType" = 'FACILITY'
      AND "facilityId" = (SELECT public.get_current_facility_id())
      AND public.has_role('FACILITY_ADMIN')
    )
  );

-- Equipment: Delete policy
DROP POLICY IF EXISTS "equipment_delete" ON "Equipment";

CREATE POLICY "equipment_delete" ON "Equipment"
  FOR DELETE
  TO authenticated
  USING (
    (
      ("ownerType" IN ('CLUB', 'TEAM') OR "ownerType" IS NULL)
      AND ("clubId" = (SELECT public.get_current_club_id())
           OR "teamId" = (SELECT public.get_current_club_id()))
    )
    OR (
      "ownerType" = 'FACILITY'
      AND "facilityId" = (SELECT public.get_current_facility_id())
      AND public.has_role('FACILITY_ADMIN')
    )
  );
```

### Data Migration Script

```sql
-- supabase/migrations/00006_facility_data_migration.sql
-- Run AFTER Prisma generates schema changes

-- Step 1: Create facility wrapper for each existing team
INSERT INTO "Facility" (id, name, slug, timezone, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  t.name,
  t.slug,
  'America/New_York',
  t."createdAt",
  NOW()
FROM "Team" t
WHERE t."facilityId" IS NULL
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Link teams to their facilities
UPDATE "Team" t
SET "facilityId" = f.id
FROM "Facility" f
WHERE f.slug = t.slug
  AND t."facilityId" IS NULL;

-- Step 3: Migrate equipment to TEAM ownership (backward compat)
UPDATE "Equipment"
SET
  "ownerType" = 'TEAM',
  "clubId" = "teamId",
  "isShared" = false
WHERE "ownerType" IS NULL
  AND "teamId" IS NOT NULL;

-- Step 4: Verify migration
DO $$
DECLARE
  unlinked_teams INTEGER;
  unmigrated_equipment INTEGER;
BEGIN
  SELECT COUNT(*) INTO unlinked_teams FROM "Team" WHERE "facilityId" IS NULL;
  SELECT COUNT(*) INTO unmigrated_equipment FROM "Equipment" WHERE "ownerType" IS NULL AND "teamId" IS NOT NULL;

  IF unlinked_teams > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % teams without facility', unlinked_teams;
  END IF;

  IF unmigrated_equipment > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % equipment without owner type', unmigrated_equipment;
  END IF;

  RAISE NOTICE 'Migration complete: all teams linked to facilities, all equipment has owner type';
END $$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session variables for tenant | JWT claims in RLS | Supabase best practice 2024+ | Connection pooling requires stateless context |
| Single tenant column | Hierarchical ownership | Multi-tenant SaaS pattern | Supports facility/club/team levels |
| RLS-only security | Defense-in-depth (CASL+RLS) | 2023+ best practices | Catches bugs at application layer |
| Big bang migrations | Expand-migrate-contract | Prisma recommendation | Safe rollback, zero downtime |

**Deprecated/outdated:**
- `set_config()` without LOCAL flag: Dangerous with transaction pooling, use JWT claims or LOCAL flag
- Single `team_id` column only: Extend with `facility_id`, `club_id` for hierarchy
- `get_user_team_id()` helper: Add `get_current_facility_id()` and `get_current_club_id()`

## Open Questions

1. **Club Without Facility (Standalone Mode)**
   - What we know: Decision says "3-level hierarchy" (Facility -> Club -> Team)
   - What's unclear: Can a club exist without a facility?
   - Recommendation: All clubs must have facility; solo clubs get auto-generated facility wrapper with same name

2. **FacilityMembership vs ClubMembership Roles**
   - What we know: FACILITY_ADMIN role exists, manages all clubs in facility
   - What's unclear: Should FacilityMembership track facility-level roles separately?
   - Recommendation: Yes, create FacilityMembership - user can be FACILITY_ADMIN without being in any specific club

3. **Shared Equipment Availability**
   - What we know: Equipment can be facility-owned and shared
   - What's unclear: Reservation/booking system for shared equipment
   - Recommendation: Defer to Phase 17 (FAC-07) - Phase 12 just adds `isShared` field

4. **Team Table Rename to Club**
   - What we know: Team currently holds club-level data
   - What's unclear: Rename Team -> Club or keep both?
   - Recommendation: Keep Team model name for backward compatibility, conceptually treat as Club

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - Official RLS documentation
- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) - Official Supabase auth hook docs
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Optimization guidance
- [Prisma Data Migration Guide](https://www.prisma.io/docs/guides/data-migration) - Expand-migrate-contract pattern

### Secondary (MEDIUM confidence)
- [AWS Multi-tenant RLS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) - set_config patterns, connection pooling
- [Crunchy Data RLS for Tenants](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) - Session variable patterns
- [Prisma Client Extensions RLS](https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security) - Official Prisma RLS example

### Tertiary (LOW confidence)
- Community discussions on Supabase GitHub about multi-tenant patterns
- Medium articles on Prisma + RLS integration

## Metadata

**Confidence breakdown:**
- Schema design: HIGH - Follows existing codebase patterns, standard multi-tenant design
- RLS with JWT claims: HIGH - Matches existing pattern, official Supabase documentation
- Migration strategy: HIGH - Prisma official guidance on expand-migrate-contract
- Equipment ownership model: MEDIUM - Designed for requirements, not industry standard pattern
- Connection pooling safety: HIGH - JWT claims verified safe with Supavisor

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain)
