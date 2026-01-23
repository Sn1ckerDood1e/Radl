---
phase: 13-facility-auth-integration
plan: 03
subsystem: auth
tags: [context-validation, cookie-recovery, club-membership, facility-context]

# Dependency graph
requires:
  - phase: 13-facility-auth-integration
    plan: 01
    provides: Extended ability factory with viewMode and facilityId
provides:
  - Context validator with auto-recovery for invalid cookies
  - validateAndRecoverContext function for cookie validation and auto-correction
  - restoreLastContext function for login continuity
  - Integration with getClaimsForApiRoute for automatic recovery
affects: [13-04-context-ui, login-flow, club-switcher, facility-switcher]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context validation with auto-recovery pattern for invalid cookies"
    - "First-available membership fallback for invalid context"
    - "Facility/club cookie sync (facility auto-derived from club)"

key-files:
  created:
    - src/lib/auth/context-validator.ts
  modified:
    - src/lib/auth/claims.ts

key-decisions:
  - "Invalid club cookie auto-selects first active ClubMembership"
  - "Facility cookie auto-syncs to match club's facility"
  - "No memberships case returns null (for onboarding redirect)"
  - "wasRecovered flag for debugging/logging"
  - "Validator integrated early in claims helper (before role lookups)"

patterns-established:
  - "Context validation pattern: validate cookies against DB, auto-recover if stale"
  - "Recovery precedence: cookie validation → first membership → clear cookies"
  - "Facility/club consistency: facility always derived from validated club"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 13 Plan 03: Context Validation & Auto-Recovery Summary

**Context validator auto-recovers invalid club/facility cookies by selecting first available membership, preventing auth crashes**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-01-23T20:01:26Z
- **Completed:** 2026-01-23T20:05:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created context-validator module with validateAndRecoverContext and restoreLastContext functions
- Integrated validator into getClaimsForApiRoute for automatic cookie recovery
- Invalid cookies now auto-correct to first available membership before permission checks
- Facility/club consistency enforced (facility always matches club's facility)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create context validator module** - `1374e76` (feat)
2. **Task 2: Integrate validator into claims helper** - `c4f6483` (feat)

## Files Created/Modified
- `src/lib/auth/context-validator.ts` - Context validation and auto-recovery logic
- `src/lib/auth/claims.ts` - Claims helper calling validator early in flow

## Decisions Made

**Recovery strategy:**
- Invalid club cookie → auto-select first active ClubMembership (ordered by joinedAt)
- Invalid facility cookie → derive from validated club's facilityId
- No memberships → return null (caller should redirect to onboarding)

**Integration point:**
- Validator called early in getClaimsForApiRoute, after JWT decoding but before role lookups
- Ensures all permission checks use validated context
- Logs recovery events for debugging

**Backward compatibility:**
- Legacy TeamMember fallback path preserved
- Database fallbacks still active for edge cases

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 1 - Bug] Fixed schema field name in orderBy**
- **Found during:** Task 1 (context validator implementation)
- **Issue:** Used `createdAt` field but ClubMembership schema has `joinedAt`
- **Fix:** Changed `orderBy: { createdAt: 'asc' }` to `orderBy: { joinedAt: 'asc' }`
- **Files modified:** src/lib/auth/context-validator.ts
- **Verification:** TypeScript compilation successful
- **Committed in:** 1374e76 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Schema field name correction required for query to work. No scope creep.

## Issues Encountered

None - plan executed smoothly with one schema field correction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Context UI integration (13-04): Can now call validateAndRecoverContext from UI components
- Login flow updates: restoreLastContext ready for use after authentication
- Club/facility switchers: Context validation ensures valid state after switches

**Notes:**
- Context validation happens automatically in getClaimsForApiRoute
- All API routes now benefit from auto-recovery without code changes
- Invalid cookies will be corrected silently, logged to console for debugging

**No blockers:** Context validation is complete and integrated.

---
*Phase: 13-facility-auth-integration*
*Completed: 2026-01-23*
