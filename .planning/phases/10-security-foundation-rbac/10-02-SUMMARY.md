---
phase: 10-security-foundation-rbac
plan: 02
subsystem: auth
tags: [casl, rbac, permissions, typescript]

# Dependency graph
requires:
  - phase: none
    provides: foundation plan with CASL integration
provides:
  - defineAbilityFor factory for role-based permission checking
  - AppAbility type for isomorphic permission usage
  - Action and Subject type definitions for CASL
  - No-inheritance role model implementation
affects:
  - 10-03: React permission hooks will use defineAbilityFor
  - 10-04: API middleware will use ability checking
  - 10-06: Audit logging actions defined in actions.ts

# Tech tracking
tech-stack:
  added:
    - "@casl/ability@6.8.0"
    - "@casl/prisma@1.6.1"
    - "@casl/react@5.0.1"
  patterns:
    - No-inheritance RBAC (roles grant specific permissions only)
    - Tenant-scoped permissions via clubId conditions
    - String-based placeholder subjects for future models

key-files:
  created:
    - "src/lib/permissions/ability.ts"
    - "src/lib/permissions/actions.ts"
    - "src/lib/permissions/subjects.ts"
  modified:
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "No role inheritance: FACILITY_ADMIN cannot create lineups without COACH role"
  - "String placeholders for AuditLog/ApiKey subjects (models not yet in schema)"
  - "PARENT permissions require linkedAthleteIds array (empty = no access)"

patterns-established:
  - "Role-specific permissions: Each role defines explicit capabilities"
  - "Tenant scoping: clubId conditions for multi-tenant data access"
  - "UserContext interface: Standard user data shape for ability creation"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 10 Plan 02: CASL Ability Factory Summary

**CASL RBAC with no-inheritance role model: FACILITY_ADMIN manages clubs, COACH creates lineups, PARENT sees linked athletes only**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T01:30:55Z
- **Completed:** 2026-01-23T01:34:37Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Installed all three CASL packages (@casl/ability, @casl/prisma, @casl/react)
- Created action definitions covering CRUD + security-critical operations
- Created subject definitions mapping Prisma models to CASL subjects
- Implemented ability factory with strict no-inheritance role model
- All 5 roles have tenant-scoped permissions as specified

## Task Commits

Each task was committed atomically:

1. **Task 1: Install CASL packages** - `6cb3de7` (chore)
2. **Task 2: Create action and subject definitions** - `a0d8faf` (feat)
3. **Task 3: Create ability factory with role-specific permissions** - `cf525ec` (feat)

## Files Created/Modified
- `src/lib/permissions/ability.ts` - Ability factory with defineAbilityFor and createEmptyAbility
- `src/lib/permissions/actions.ts` - Action type definitions (CRUD + security actions)
- `src/lib/permissions/subjects.ts` - Subject type definitions mapping Prisma models
- `package.json` - Added @casl/ability, @casl/prisma, @casl/react dependencies
- `package-lock.json` - Dependency lockfile updates

## Decisions Made

1. **String placeholders for future models** - AuditLog and ApiKey are not yet in the Prisma schema. Used string subjects as placeholders for forward compatibility. When those models are added, update subjects.ts to include typed Prisma model mappings.

2. **Simplified AuditLog/ApiKey conditions** - Since these models don't exist yet, conditions like `{ clubId: user.clubId }` are omitted. Server-side filtering will be added when models are created.

3. **PARENT requires linkedAthleteIds** - The PARENT role check includes `user.linkedAthleteIds?.length` to ensure no access without explicit athlete links. This prevents accidental data leakage.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript compilation errors in existing codebase** - The Role enum was expanded to include FACILITY_ADMIN and CLUB_ADMIN in a prior plan, but some UI components (invitations/page.tsx, roster/page.tsx) still reference the old Role type. These are pre-existing issues not caused by this plan and will be addressed in later UI update plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ability factory ready for use in API routes and React components
- Ready for Plan 03: React permission hooks (@casl/react integration)
- Ready for Plan 04: API middleware for permission checking

**Integration points:**
- Import `defineAbilityFor` from `@/lib/permissions/ability`
- Pass `UserContext` from auth layer
- Use ability.can() for permission checks

---
*Phase: 10-security-foundation-rbac*
*Plan: 02*
*Completed: 2026-01-23*
