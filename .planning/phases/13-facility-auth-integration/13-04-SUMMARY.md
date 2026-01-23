---
phase: 13-facility-auth-integration
plan: 04
subsystem: ui
tags: [context-switcher, dropdown, facility, club, jwt-refresh, router-cache]

# Dependency graph
requires:
  - phase: 13-facility-auth-integration
    plan: 01
    provides: Extended UserContext with facilityId and viewMode fields
  - phase: 13-facility-auth-integration
    plan: 02
    provides: Unified context switch API endpoint (/api/context/switch)
provides:
  - ContextSwitcher component with facility and club support
  - Available contexts API endpoint (/api/context/available)
  - JWT refresh after context switch
  - Router cache invalidation pattern
affects: [dashboard-layouts, navigation, header-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Context switcher with JWT refresh and router cache invalidation"
    - "Available contexts API returning facility, clubs, currentContext"

key-files:
  created:
    - src/components/layout/context-switcher.tsx
    - src/app/api/context/available/route.ts
  modified: []

key-decisions:
  - "Facility option shown at top with building icon for visual distinction"
  - "JWT refreshSession called after context switch to update claims"
  - "router.refresh() called to invalidate Next.js router cache"
  - "Single-club non-facility-admin users see simple display (no dropdown)"

patterns-established:
  - "Context switch flow: API call -> JWT refresh -> router push -> router refresh"
  - "Available contexts API returns structured response with facility, clubs, currentContext"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 13 Plan 04: Context Switcher UI Summary

**ContextSwitcher component supporting facility and club views with JWT refresh and router cache invalidation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T20:09:31Z
- **Completed:** 2026-01-23T20:12:30Z
- **Tasks:** 2
- **Files modified:** 2 (2 created)

## Accomplishments
- Created /api/context/available endpoint returning facility, clubs, currentContext
- Created ContextSwitcher component with facility and club view support
- Implemented JWT refresh after context switch via supabase.auth.refreshSession()
- Implemented router cache invalidation via router.refresh()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create available contexts API** - `059b9b6` (feat)
2. **Task 2: Create ContextSwitcher component** - `adbbd27` (feat)

## Files Created/Modified
- `src/app/api/context/available/route.ts` - API returning user's available contexts (facility, clubs, currentContext)
- `src/components/layout/context-switcher.tsx` - Unified context switcher supporting facility and club views

## Decisions Made

**1. Facility option visual distinction**
- Building icon used for facility view (vs club avatar)
- "Facility View" subtext under facility name
- Separator between facility and clubs in dropdown

**2. Context switch flow**
- API call to /api/context/switch (with facilityId, optional clubId)
- JWT refreshSession() to update claims immediately
- router.push() to navigate to new context route
- router.refresh() to invalidate cached server components

**3. Single-club handling**
- Users with one club and no facility admin role see simple name display (no dropdown)
- Users with multiple clubs or facility admin role see full dropdown

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Integration into dashboard layouts (replace ClubSwitcher with ContextSwitcher)
- Facility dashboard routes (/facility/[slug])
- FACILITY_ADMIN role testing with viewMode-based permissions

**Notes:**
- ContextSwitcher can be used as drop-in replacement for ClubSwitcher
- Backward compatible: works with single-club users (no facility)
- initialContexts prop enables SSR hydration for faster initial render

---
*Phase: 13-facility-auth-integration*
*Completed: 2026-01-23*
