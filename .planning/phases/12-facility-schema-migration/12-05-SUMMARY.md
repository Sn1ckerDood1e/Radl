---
phase: 12-facility-schema-migration
plan: 05
subsystem: database
tags: [rls, postgresql, security, multi-tenant, supabase]

# Dependency graph
requires:
  - phase: 12-01
    provides: Facility model, FacilityMembership, Equipment ownership hierarchy
  - phase: 12-02
    provides: RLS helper functions (get_current_facility_id, is_facility_admin, etc.)
provides:
  - RLS policies for Facility table (SELECT by members, UPDATE by admin)
  - RLS policies for FacilityMembership table (full CRUD for admin)
  - Hierarchical Equipment RLS policies (FACILITY/CLUB/TEAM ownership)
  - Shared equipment visibility within facility
affects: [12-facility-auth-api, 13-facility-api, 17-facility-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hierarchical RLS: ownership type determines visibility scope"
    - "DROP POLICY IF EXISTS before CREATE for idempotent migrations"

key-files:
  created:
    - supabase/migrations/00008_facility_rls_policies.sql
  modified: []

key-decisions:
  - "Users can view own FacilityMembership without admin role (self-service)"
  - "Shared club equipment visible to entire facility (isShared=true flag)"
  - "Equipment policies use ownerType enum to determine access rules"

patterns-established:
  - "Equipment hierarchical visibility: TEAM->club, CLUB->club/facility(if shared), FACILITY->facility"

# Metrics
duration: 1min
completed: 2026-01-23
---

# Phase 12 Plan 05: RLS Policies for Facility Hierarchy Summary

**13 PostgreSQL RLS policies enforcing multi-tenant isolation for Facility, FacilityMembership, and hierarchical Equipment ownership**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-23T18:38:29Z
- **Completed:** 2026-01-23T18:39:21Z
- **Tasks:** 2
- **Files created:** 1

## Accomplishments

- RLS enabled on Facility and FacilityMembership tables
- 4 Facility policies: SELECT for members, INSERT/UPDATE/DELETE for FACILITY_ADMIN
- 5 FacilityMembership policies: full CRUD for admin, plus self-view for users
- 4 Equipment policies updated for hierarchical ownership:
  - TEAM-owned: visible to team members
  - CLUB-owned: visible to club members (or facility if shared)
  - FACILITY-owned: visible to all facility members
- Verification queries included in migration file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RLS policies SQL migration** - `a01ff4c` (feat)
2. **Task 2: Document manual step for applying policies** - included in Task 1 commit (verification queries in SQL file)

**Plan metadata:** pending

## Files Created

- `supabase/migrations/00008_facility_rls_policies.sql` - 13 RLS policies with verification queries

## Decisions Made

- **Users can view own FacilityMembership:** Added `facility_membership_select_own` policy so users can check their own facility membership without requiring admin role
- **Shared club equipment visible facility-wide:** Equipment with `isShared=true` and `ownerType=CLUB` is visible to all facility members, enabling shared boat scenarios
- **Idempotent equipment policy migration:** Used `DROP POLICY IF EXISTS` before creating new hierarchical policies to support re-running migration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**Database migration requires manual application.** Run the SQL in Supabase SQL Editor:

1. Open Supabase Dashboard -> SQL Editor
2. Copy contents of `supabase/migrations/00008_facility_rls_policies.sql`
3. Execute the SQL

**Verify with:**

```sql
-- Check RLS is enabled on tables:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('Facility', 'FacilityMembership', 'Equipment');

-- Check policies exist:
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('Facility', 'FacilityMembership', 'Equipment')
ORDER BY tablename, policyname;
```

**Expected results:**
- All three tables should have `rowsecurity = true`
- 13 policies total across the three tables

## Next Phase Readiness

- **Ready:** RLS policies enforce tenant isolation at database level
- **Ready:** Equipment hierarchy visibility matches business requirements
- **Dependency:** JWT claims must include `facility_id` and `user_roles` (done in 12-03 custom_access_token_hook)
- **Next:** Phase 13 can build facility management API endpoints with confidence in RLS enforcement

---
*Phase: 12-facility-schema-migration*
*Completed: 2026-01-23*
