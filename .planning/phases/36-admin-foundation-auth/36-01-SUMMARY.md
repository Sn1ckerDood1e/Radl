---
phase: 36-admin-foundation-auth
plan: 01
subsystem: auth
tags: [super-admin, jwt, prisma, supabase, rls, database]

# Dependency graph
requires:
  - phase: 13-facility-auth-integration
    provides: Custom access token hook infrastructure
provides:
  - SuperAdmin Prisma model with userId unique constraint
  - SuperAdmin database table with RLS policies
  - is_super_admin JWT claim in access token hook
  - Seed script for creating first super admin
affects: [36-02, 36-03, 37-user-management, admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Database-verified super admin (not JWT claims only)
    - SuperAdmin table protected by RLS (only super admins can read)
    - Seed script pattern for security-sensitive initial setup

key-files:
  created:
    - supabase/migrations/00018_super_admin.sql
    - scripts/seed-super-admin.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "SuperAdmin table uses userId unique constraint for one record per user"
  - "RLS policies block all writes via API; super admins created via seed script only"
  - "is_super_admin boolean claim added to JWT for fast middleware checks"
  - "createdBy field nullable for first super admin (seeded without actor)"

patterns-established:
  - "Seed script pattern: scripts/seed-*.ts for security-sensitive data"
  - "Super admin cannot be granted via UI (intentional security measure)"

# Metrics
duration: 2min
completed: 2026-01-31
---

# Phase 36 Plan 01: Super Admin Database Infrastructure Summary

**SuperAdmin table with RLS protection and is_super_admin JWT claim for platform-level admin authentication**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-31T01:04:31Z
- **Completed:** 2026-01-31T01:06:54Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- SuperAdmin Prisma model added with userId unique constraint and audit trail fields
- SuperAdmin table created with RLS policies restricting access to super admins only
- Access token hook updated to include is_super_admin boolean claim
- Seed script created for initial super admin setup via command line

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SuperAdmin model to Prisma schema** - `9e93ff9` (feat)
2. **Task 2: Create Supabase migration for SuperAdmin table and access token hook** - `ca39b32` (feat)
3. **Task 3: Create seed script for first super admin** - `d8efb46` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added SuperAdmin model with userId unique, createdAt, createdBy fields
- `supabase/migrations/00018_super_admin.sql` - Creates SuperAdmin table, RLS policies, and updates access token hook
- `scripts/seed-super-admin.ts` - TypeScript script to create first super admin via command line

## Decisions Made
- **userId unique constraint:** One SuperAdmin record per user ensures no duplicates
- **RLS blocks all writes:** Super admins cannot be created/updated/deleted via API; requires seed script or direct SQL
- **createdBy nullable:** First super admin has no creator (seeded), subsequent admins track who granted access
- **is_super_admin evaluated first:** Hook checks super admin status before club/facility context for fast path

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

After running the migration, the first super admin must be created:

1. Run migration `00018_super_admin.sql` in Supabase SQL Editor
2. Get the Supabase user ID of the intended super admin
3. Run seed script: `npx tsx scripts/seed-super-admin.ts <userId>`
4. User must log out and log back in to receive new JWT with `is_super_admin: true`

## Next Phase Readiness
- SuperAdmin table and JWT claim ready for middleware implementation
- Plan 02 (Admin middleware and route protection) can proceed
- Seed script ready for deployment team to create first super admin

---
*Phase: 36-admin-foundation-auth*
*Completed: 2026-01-31*
