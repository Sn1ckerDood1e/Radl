---
phase: 11-mfa-sso
plan: 06
subsystem: auth
tags: [casl, permissions, rbac, grants]

# Dependency graph
requires:
  - phase: 11-01
    provides: PermissionGrant model schema
  - phase: 11-04
    provides: getUserEffectiveRoles helper function
provides:
  - CASL ability integration with temporary permission grants
  - Claims helper returns effective roles including grants
  - Transparent grant integration (ability builder unchanged)
affects: [11-05, 11-08, 12-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grant merge at claims layer: claims.ts merges base + granted roles before ability builder"
    - "Transparent role array: ability builder processes roles without knowing source"

key-files:
  created: []
  modified:
    - src/lib/auth/claims.ts
    - src/lib/permissions/ability.ts

key-decisions:
  - "Merge grants at claims layer not ability layer - keeps ability builder role-agnostic"

patterns-established:
  - "Claims layer responsibility: All role merging happens before ability builder"
  - "Ability builder stays pure: Only processes roles array, no DB calls"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 11 Plan 06: CASL Ability Integration Summary

**Claims helper now merges temporary permission grants with base roles for seamless elevated access**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-23T14:52:14Z
- **Completed:** 2026-01-23T14:54:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Claims helper calls getUserEffectiveRoles to merge base + granted roles
- UserContext documentation clarifies roles may include temporary grants
- Ability builder remains unchanged - transparent integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Update claims helper to include effective roles with grants** - `6eb438c` (feat)
2. **Task 2: Add UserContext type documentation** - `f7f205b` (docs)

## Files Created/Modified
- `src/lib/auth/claims.ts` - Added getUserEffectiveRoles import and call to merge grants
- `src/lib/permissions/ability.ts` - Updated UserContext JSDoc explaining grant inclusion

## Decisions Made
- Merge grants at claims layer not ability layer: This keeps the ability builder role-agnostic and the architecture clean. The claims layer is already responsible for constructing the user context, so it's the natural place for grant merging.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Permission grants now transparently integrate with CASL ability checks
- User with COACH base role + CLUB_ADMIN grant will see CLUB_ADMIN permissions
- Ready for grant API endpoints (11-05) and UI components (11-08)

---
*Phase: 11-mfa-sso*
*Completed: 2026-01-23*
