---
phase: 36-admin-foundation-auth
plan: 02
subsystem: auth
tags: [casl, super-admin, audit, permissions, prisma]

# Dependency graph
requires:
  - phase: 36-01
    provides: SuperAdmin model in Prisma schema
provides:
  - Database-verified super admin authentication helpers
  - CASL abilities with isSuperAdmin and can('manage', 'all')
  - Admin audit logging with before/after state capture
affects: [admin-routes, user-management, facility-management, club-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Database-verified super admin (not JWT claims)"
    - "Silent redirect for non-admins (no error disclosure)"
    - "'PLATFORM' clubId for platform-level audit logs"
    - "AdminAuditEntry with beforeState/afterState"

key-files:
  created:
    - src/lib/auth/admin-authorize.ts
  modified:
    - src/lib/permissions/ability.ts
    - src/lib/permissions/subjects.ts
    - src/lib/permissions/actions.ts
    - src/lib/auth/claims.ts
    - src/lib/audit/logger.ts
    - src/lib/audit/actions.ts

key-decisions:
  - "Database is source of truth for super admin, not JWT claims"
  - "Silent redirect to / for non-admins (no admin panel disclosure)"
  - "Super admin gets can('manage', 'all') bypassing all role checks"
  - "'PLATFORM' as clubId marker for platform-level audit logs"

patterns-established:
  - "isSuperAdmin(): Always query SuperAdmin table directly"
  - "requireSuperAdmin(): Server component auth with silent redirect"
  - "getSuperAdminContext(): API route auth returning null for unauthorized"
  - "logAdminAction(): Admin audit with beforeState/afterState capture"

# Metrics
duration: 6min
completed: 2026-01-31
---

# Phase 36 Plan 02: Super Admin Auth Infrastructure Summary

**Database-verified super admin auth with CASL can('manage', 'all') and admin audit logging with before/after state capture**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-31T01:04:51Z
- **Completed:** 2026-01-31T01:10:30Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created admin-authorize.ts with isSuperAdmin(), requireSuperAdmin(), getSuperAdminContext()
- Extended CASL abilities to support super admin with full platform access via can('manage', 'all')
- Added 11 ADMIN_* audit actions for platform-level operations
- Implemented AdminAuditEntry with beforeState/afterState for compliance (AUDT-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin-authorize.ts with database-verified super admin checks** - `27d0b04` (feat)
2. **Task 2: Extend CASL ability.ts with super admin support** - `86f1b62` (feat)
3. **Task 3: Extend audit logger for admin actions with before/after state** - `e8cb360` (feat)

## Files Created/Modified

- `src/lib/auth/admin-authorize.ts` - Super admin verification helpers (isSuperAdmin, requireSuperAdmin, getSuperAdminContext)
- `src/lib/permissions/ability.ts` - Extended with isSuperAdmin in UserContext and early-return full access
- `src/lib/permissions/subjects.ts` - Added 'all' as CASL special keyword
- `src/lib/permissions/actions.ts` - Added accessAdminPanel action
- `src/lib/auth/claims.ts` - Added is_super_admin to CustomJwtPayload
- `src/lib/audit/logger.ts` - Added AdminAuditEntry, logAdminAction, createAdminAuditLogger
- `src/lib/audit/actions.ts` - Added 11 ADMIN_* audit actions with descriptions

## Decisions Made

- **Database-verified super admin:** Always query SuperAdmin table, never trust JWT claims alone for platform-level access
- **Silent redirect:** Non-admins redirected to '/' without error message to avoid disclosing admin panel existence
- **CASL super admin pattern:** Check isSuperAdmin first in defineAbilityFor() with early return for performance
- **'PLATFORM' clubId:** Platform-level audit logs use 'PLATFORM' as clubId to distinguish from club-scoped logs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript error with Prisma.InputJsonValue for metadata object - resolved by extracting metadata to variable with explicit cast

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth infrastructure ready for admin route group setup (Plan 36-03)
- Admin panel can use requireSuperAdmin() for server components
- Admin APIs can use getSuperAdminContext() for authorization
- All admin mutations can be audited with logAdminAction()

---
*Phase: 36-admin-foundation-auth*
*Completed: 2026-01-31*
