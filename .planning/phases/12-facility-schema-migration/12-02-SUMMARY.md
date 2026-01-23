---
phase: 12-facility-schema-migration
plan: 02
subsystem: database
tags: [rls, postgresql, jwt, supabase, security]

# Dependency graph
requires:
  - phase: 12-01
    provides: Facility model and hierarchy enums
provides:
  - RLS helper functions for facility hierarchy
  - JWT claim extraction utilities (facility_id, club_id)
  - Role checking functions (has_role, has_any_role)
  - Convenience functions (is_facility_admin, is_club_admin_or_higher, is_coach_or_higher)
affects: [12-03, 12-04, facility-rls-policies]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - STABLE/SECURITY DEFINER for connection pooling safe functions
    - current_setting('request.jwt.claims') for JWT access in RLS

key-files:
  created:
    - supabase/migrations/00005_facility_rls_helpers.sql
  modified: []

key-decisions:
  - "Used public.get_current_team_id() as backward compat alias for get_current_club_id()"
  - "user_roles is a JSON array in claims (supports multiple roles per context)"

patterns-established:
  - "JWT claim extraction: current_setting('request.jwt.claims', true)::jsonb ->> 'claim_name'"
  - "Role checking via has_role() and has_any_role() for hierarchical permissions"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 12 Plan 02: RLS Helper Functions Summary

**8 PostgreSQL RLS helper functions for extracting facility/club context and checking roles from JWT claims**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T18:35:17Z
- **Completed:** 2026-01-23T18:38:30Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Created 8 RLS helper functions for facility hierarchy
- get_current_facility_id() and get_current_club_id() extract tenant context from JWT
- has_role() and has_any_role() enable role-based access control in RLS policies
- Convenience functions (is_facility_admin, is_club_admin_or_higher, is_coach_or_higher) simplify common checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RLS helper functions SQL migration** - `e627e63` (feat)
2. **Task 2: Apply RLS helper functions to database** - verification only, documented in Task 1 commit

**Plan metadata:** pending

## Files Created/Modified
- `supabase/migrations/00005_facility_rls_helpers.sql` - 8 RLS helper functions with GRANT statements

## Decisions Made
- Used `public.get_current_team_id()` as backward compatibility alias for `get_current_club_id()` - maintains v1.0 compatibility while transitioning to facility model
- JWT claims use `user_roles` as array (not single `user_role`) - supports multiple concurrent roles per context
- All functions use STABLE and SECURITY DEFINER for connection pooling compatibility

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**Database migration requires manual application.** Run the SQL in Supabase SQL Editor:

1. Open Supabase Dashboard -> SQL Editor
2. Copy contents of `supabase/migrations/00005_facility_rls_helpers.sql`
3. Execute the SQL

Verify with:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_current_facility_id',
    'get_current_club_id',
    'get_current_team_id',
    'has_role',
    'has_any_role',
    'is_facility_admin',
    'is_club_admin_or_higher',
    'is_coach_or_higher'
  );
```

Should return 8 rows.

## Next Phase Readiness
- Helper functions ready for use in RLS policies
- 12-03 can now create equipment RLS policies using these functions
- custom_access_token_hook needs updating (Phase 13) to inject facility_id/club_id/user_roles claims

---
*Phase: 12-facility-schema-migration*
*Completed: 2026-01-23*
