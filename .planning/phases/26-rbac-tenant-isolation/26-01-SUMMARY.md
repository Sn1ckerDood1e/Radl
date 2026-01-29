---
phase: 26-rbac-tenant-isolation
plan: 01
subsystem: database
tags: [rls, postgresql, supabase, security, tenant-isolation]

# Dependency graph
requires:
  - phase: 10-facility-model
    provides: Multi-tenant facility/club/team hierarchy
  - phase: 15-rbac-foundation
    provides: CASL abilities and RLS helper functions
provides:
  - Complete RLS status audit for all 43 tables
  - ISOL-01 baseline: 5 tables have RLS enabled
  - ISOL-02 baseline: Tenant filtering policies documented
  - Critical gap identified: Equipment policies inactive
  - Prioritized remediation recommendations
affects: [26-02, 26-03, 26-04, 26-05]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/26-rbac-tenant-isolation/26-01-RLS-AUDIT.md
  modified: []

key-decisions:
  - "Equipment table is CRITICAL priority - has policies but RLS disabled"
  - "38 tables rely on application-level protection only (no database RLS)"
  - "Child records can be protected transitively via parent table RLS"
  - "Service role bypass needed for AuditLog, Notification, PushSubscription"

patterns-established: []

# Metrics
duration: 4min
completed: 2026-01-29
---

# Phase 26 Plan 01: RLS Audit Summary

**Audited RLS status for all 43 database tables - found only 5 (12%) have RLS enabled, with critical gap: Equipment table has policies but RLS is not enabled**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-29T02:58:39Z
- **Completed:** 2026-01-29T03:02:38Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Queried pg_tables for rowsecurity status on all 43 public schema tables
- Queried pg_policies for all 23 existing RLS policies
- Identified critical gap: Equipment table has 4 well-designed policies but RLS is disabled
- Documented ISOL-01 status: 5/43 tables have RLS enabled (Facility, FacilityMembership, Team, TeamMember, Invitation)
- Documented ISOL-02 status: All 5 enabled tables have proper tenant filtering via JWT claims or auth.uid()
- Created prioritized remediation recommendations by data sensitivity

## Task Commits

1. **Tasks 1-2: Query RLS Status & Create Audit Document** - `d7dd97d` (docs)

## Files Created/Modified

- `.planning/phases/26-rbac-tenant-isolation/26-01-RLS-AUDIT.md` - Complete RLS audit with status tables, policy details, gap analysis, and recommendations

## Decisions Made

1. **Equipment is CRITICAL priority:** Policies exist but RLS disabled means all Equipment policies have no effect
2. **Application-level protection acceptable as defense-in-depth:** 38 tables rely on Supabase Auth + CASL + Prisma queries, but this doesn't protect against direct DB access or service key compromise
3. **Child records can use transitive protection:** PracticeBlock, Lineup, SeatAssignment etc. can be protected via parent table RLS, though direct RLS provides defense-in-depth
4. **Some tables need service_role bypass:** AuditLog, Notification, PushSubscription need system-level writes, should have RLS with service_role policies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npx supabase db query` command not available in Supabase CLI v2.72.9 - resolved by using Prisma `$queryRaw` to run SQL queries directly against pg_tables and pg_policies

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 26-02:** RLS audit provides clear baseline for implementing missing policies

**Priorities for remediation:**
1. **Immediate:** Enable RLS on Equipment table (policies already exist)
2. **High:** Add RLS to security-sensitive tables (AuditLog, ApiKey, MfaBackupCode, ClubMembership, PermissionGrant)
3. **Medium:** Add RLS to operational tables (Practice, DamageReport, Announcement, Season, Regatta)
4. **Lower:** Add RLS to child records for defense-in-depth

**No blockers for subsequent plans.**

---
*Phase: 26-rbac-tenant-isolation*
*Completed: 2026-01-29*
