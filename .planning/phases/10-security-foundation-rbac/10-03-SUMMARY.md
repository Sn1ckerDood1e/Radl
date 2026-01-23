---
phase: 10-security-foundation-rbac
plan: 03
subsystem: auth
tags: [cookies, multi-club, context, httpOnly, session]

# Dependency graph
requires:
  - phase: 10-01
    provides: ClubMembership model with roles array
provides:
  - Club context cookie management (getCurrentClubId, setCurrentClubId, clearCurrentClubId)
  - Club switch API endpoint (POST /api/clubs/switch)
  - Extended claims helper with clubId and roles
affects: [10-04, 10-05, dashboard-club-switcher, api-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - httpOnly cookie for club context (secure, not accessible to client JS)
    - ClaimsResult with clubId/roles for authorization context
    - Backward compatibility with team_id/user_role for legacy data

key-files:
  created:
    - src/lib/auth/club-context.ts
    - src/app/api/clubs/switch/route.ts
  modified:
    - src/lib/auth/claims.ts

key-decisions:
  - "1-year cookie expiration for club context persistence"
  - "Fall back to legacy team_id when no club cookie set"

patterns-established:
  - "Club context via httpOnly cookie, not JWT claims"
  - "ClaimsResult includes clubId and roles array for authorization"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 10 Plan 03: Club Context Management Summary

**Club context via httpOnly cookie with switch API verifying ClubMembership before allowing club changes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T01:39:09Z
- **Completed:** 2026-01-23T01:42:16Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created club context utilities for httpOnly cookie management
- Built club switch API that verifies ClubMembership.isActive before allowing switch
- Extended ClaimsResult to include clubId and roles array
- Maintained backward compatibility with legacy team_id/user_role

## Task Commits

Each task was committed atomically:

1. **Task 1: Create club context utilities** - `cac0203` (feat)
2. **Task 2: Create club switch API endpoint** - `23927cb` (feat)
3. **Task 3: Extend claims helper with club context** - `6789d3f` (feat)

## Files Created/Modified

- `src/lib/auth/club-context.ts` - Cookie management: getCurrentClubId, setCurrentClubId, clearCurrentClubId
- `src/app/api/clubs/switch/route.ts` - POST endpoint to switch clubs with membership verification
- `src/lib/auth/claims.ts` - Extended ClaimsResult with clubId and roles, added backward compatibility

## Decisions Made

- **1-year cookie expiration**: Long-lived to avoid frequent club re-selection; cleared on logout
- **Fall back to team_id**: When no club cookie exists, uses legacy team_id from JWT for backward compatibility
- **httpOnly cookie (not JWT)**: Club context stored in cookie rather than JWT claims - allows switching without token refresh

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Club context utilities ready for use by dashboard club switcher UI
- ClaimsResult.clubId and ClaimsResult.roles available for API route authorization
- Switch API can be called by client-side club selector component
- Backward compatibility ensures existing team-based features continue working

---
*Phase: 10-security-foundation-rbac*
*Completed: 2026-01-23*
