---
phase: 01-security-foundation
plan: 01
subsystem: auth
tags: [jwt, supabase, claims, error-handling, multi-tenant]

# Dependency graph
requires: []
provides:
  - Centralized claims helper (getClaimsForApiRoute) with getUser() security pattern
  - CustomJwtPayload type (single source of truth)
  - Error response utilities with reference IDs
  - Database fallback for stale JWT claims
affects:
  - All future API routes should use getClaimsForApiRoute
  - Rate limiting (01-02) will build on these error utilities
  - Tenant isolation audit (01-03) relies on consistent claims pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getUser() before getSession() for JWT validation"
    - "Database fallback for team_id when JWT stale"
    - "Error responses with reference IDs for debugging"

key-files:
  created:
    - src/lib/auth/claims.ts
    - src/lib/errors/index.ts
  modified:
    - src/lib/auth/authorize.ts
    - src/app/api/equipment/route.ts
    - src/app/api/equipment/[id]/route.ts
    - src/app/api/equipment/[id]/damage-reports/[reportId]/route.ts
    - src/app/api/invitations/route.ts
    - src/app/api/invitations/[id]/route.ts
    - src/app/api/invitations/bulk/route.ts
    - src/app/api/athletes/route.ts
    - src/app/api/athletes/[id]/route.ts
    - src/app/api/team-settings/route.ts
    - src/app/api/notifications/route.ts

key-decisions:
  - "Claims helper returns { user, claims, error } tuple for flexibility"
  - "Error utilities include reference IDs only on server errors (not 401/403)"
  - "Notifications route uses userId not team_id (user-scoped data)"

patterns-established:
  - "API auth pattern: const { user, claims, error } = await getClaimsForApiRoute(); if (error || !user) return unauthorizedResponse();"
  - "Team guard pattern: if (!claims?.team_id) return forbiddenResponse('No team associated with user');"
  - "Role guard pattern: if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can...');"

# Metrics
duration: 5min
completed: 2026-01-21
---

# Phase 01 Plan 01: Claims Helper Refactor Summary

**Centralized JWT claims helper with getUser() security pattern and standardized error responses across 10 API routes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-21T03:51:30Z
- **Completed:** 2026-01-21T03:56:35Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Created `getClaimsForApiRoute()` helper that uses `getUser()` before `getSession()` (security fix for SEC-01)
- Extracted `CustomJwtPayload` as single interface definition
- Refactored 10 authenticated API routes to use centralized pattern
- Added error utilities with reference IDs for debugging (serverErrorResponse logs with ref)
- Eliminated duplicate `getClaimsWithFallback()` helpers across codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Create claims helper and error utilities** - `69693e0` (feat)
2. **Task 2: Refactor API routes to use claims helper** - `d6a15eb` (refactor)
3. **Task 3: Update authorize.ts to use shared types** - `089cddc` (refactor)

## Files Created/Modified

- `src/lib/auth/claims.ts` - Centralized getClaimsForApiRoute() and CustomJwtPayload
- `src/lib/errors/index.ts` - unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse
- `src/lib/auth/authorize.ts` - Now imports CustomJwtPayload from claims.ts
- `src/app/api/equipment/route.ts` - Refactored GET, POST
- `src/app/api/equipment/[id]/route.ts` - Refactored GET, PATCH, DELETE
- `src/app/api/equipment/[id]/damage-reports/[reportId]/route.ts` - Refactored PATCH
- `src/app/api/invitations/route.ts` - Refactored GET, POST
- `src/app/api/invitations/[id]/route.ts` - Refactored DELETE, PATCH
- `src/app/api/invitations/bulk/route.ts` - Refactored POST
- `src/app/api/athletes/route.ts` - Refactored GET, POST
- `src/app/api/athletes/[id]/route.ts` - Refactored GET, PATCH
- `src/app/api/team-settings/route.ts` - Refactored GET, PATCH
- `src/app/api/notifications/route.ts` - Refactored GET, PATCH (user-scoped, no team_id check)

## Decisions Made

- **Claims helper return type:** Returns `{ user, claims, error }` tuple instead of discriminated union. Simpler destructuring pattern at call sites.
- **Error reference IDs:** Only included on 500 errors (serverErrorResponse). Auth/permission errors (401/403/404) don't need refs since they're expected states.
- **Notifications route:** Uses userId not team_id for queries since notifications are user-scoped. Still uses claims helper for auth but skips team check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Refactored damage-reports/[reportId] route**
- **Found during:** Task 2 (API route refactoring)
- **Issue:** Plan listed 10 routes but damage-reports/[reportId]/route.ts also had local CustomJwtPayload
- **Fix:** Refactored to use centralized claims helper for consistency
- **Files modified:** src/app/api/equipment/[id]/damage-reports/[reportId]/route.ts
- **Verification:** grep confirms 0 local CustomJwtPayload in API routes
- **Committed in:** d6a15eb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Necessary for complete refactoring. Route was authenticated and had duplicate pattern.

## Issues Encountered

- Node.js version (18.x) doesn't meet Next.js 16 requirement (20.9.0+), so `npm run build` couldn't verify. Used `npx tsc --noEmit` instead which passes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Claims helper ready for all future API routes
- Error utilities ready for rate limiting implementation (01-02)
- DEBT-01 (Claims helper utility) is now complete
- Ready for SEC-02 rate limiting plan

---
*Phase: 01-security-foundation*
*Completed: 2026-01-21*
