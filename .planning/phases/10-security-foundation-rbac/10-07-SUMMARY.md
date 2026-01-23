---
phase: 10-security-foundation-rbac
plan: 07
subsystem: api
tags: [casl, permissions, rbac, api-routes, authorization]

# Dependency graph
requires:
  - phase: 10-02
    provides: CASL ability definition with defineAbilityFor
  - phase: 10-03
    provides: Club context management with claims helper
provides:
  - getAuthContext helper combining session/API key auth with CASL ability
  - AuthContext and AuthContextResult types for API routes
  - Pattern for CASL-enabled API routes with accessibleBy
affects: [10-08, 10-09, 10-10, 10-11, all-future-api-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getAuthContext for unified auth in API routes
    - accessibleBy for query filtering
    - ability.can for permission checks
    - ForbiddenError handling returns empty arrays

key-files:
  created:
    - src/lib/auth/get-auth-context.ts
  modified:
    - src/app/api/practices/route.ts
    - src/app/api/equipment/route.ts
    - src/app/api/lineups/route.ts

key-decisions:
  - "getAuthContext handles both session and API key auth transparently"
  - "API key auth uses x-api-key-* headers set by middleware"
  - "PARENT role linkedAthleteIds deferred (TODO) until ParentAthleteLink table exists"
  - "ForbiddenError returns empty arrays instead of 403 for list endpoints"
  - "Business logic filters (e.g., PUBLISHED status) handled separately from CASL"

patterns-established:
  - "Pattern 1: Use getAuthContext(request) at start of every API route"
  - "Pattern 2: Check !result.success and return 401/403 based on status"
  - "Pattern 3: Use accessibleBy(context.ability).ModelName in Prisma AND clause"
  - "Pattern 4: Wrap queries in try/catch for ForbiddenError, return empty array"
  - "Pattern 5: Use ability.can('create', 'ModelName') before mutations"

# Metrics
duration: 8min
completed: 2026-01-23
---

# Phase 10 Plan 07: CASL API Integration Summary

**getAuthContext helper combining session/API key auth with CASL abilities, applied to practices/equipment/lineups API routes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T (session start)
- **Completed:** 2026-01-23T
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created getAuthContext helper that unifies session and API key authentication
- Integrated CASL accessibleBy() for automatic query filtering in GET handlers
- Replaced role === checks with ability.can() for consistent permission enforcement
- Established pattern for ForbiddenError handling (empty arrays vs 500 errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified auth context helper** - `d41f16f` (feat)
2. **Task 2: Update practices route to use CASL** - `df516cf` (feat)
3. **Task 3: Update equipment and lineups routes to use CASL** - `cad1474` (feat)

## Files Created/Modified

- `src/lib/auth/get-auth-context.ts` - Unified auth context with session/API key support and CASL ability
- `src/app/api/practices/route.ts` - GET uses accessibleBy, POST uses ability.can
- `src/app/api/equipment/route.ts` - GET uses accessibleBy, POST uses ability.can
- `src/app/api/lineups/route.ts` - GET uses accessibleBy, POST uses ability.can

## Decisions Made

1. **getAuthContext returns discriminated union** - `AuthContextResult` is either `{ success: true; context }` or `{ success: false; error; status }` for clean error handling
2. **PARENT linkedAthleteIds deferred** - TODO comment added, will be implemented when ParentAthleteLink table is created
3. **Business logic separate from CASL** - PUBLISHED status filter handled in application code, not CASL rules (allows coaches to see drafts)
4. **Terminology updated** - Error messages changed from "team" to "club" for v2.0 consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API routes now use CASL for consistent permission enforcement
- Pattern established for remaining API routes (10-08, 10-09)
- getAuthContext ready for use in all future API routes
- No blockers for subsequent plans

---
*Phase: 10-security-foundation-rbac*
*Completed: 2026-01-23*
