---
phase: 13-facility-auth-integration
plan: 05
subsystem: auth
tags: [ability-provider, context-switcher, dashboard-layout, onboarding, casl]

# Dependency graph
requires:
  - phase: 13-facility-auth-integration
    plan: 01
    provides: Extended UserContext with facilityId and viewMode fields
  - phase: 13-facility-auth-integration
    plan: 02
    provides: Unified context switch API endpoint (/api/context/switch)
  - phase: 13-facility-auth-integration
    plan: 03
    provides: Context validator with auto-recovery
  - phase: 13-facility-auth-integration
    plan: 04
    provides: ContextSwitcher component and available contexts API
provides:
  - Dashboard layout with AbilityProvider integration
  - ContextSwitcher in dashboard header
  - Onboarding page for users without memberships
  - SSR-hydrated contexts for header
affects: [all-dashboard-pages, navigation, permissions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AbilityProvider wrapping dashboard children for CASL permissions"
    - "SSR context hydration for header ContextSwitcher"
    - "No-membership redirect to onboarding page"

key-files:
  created:
    - src/app/(auth)/onboarding/page.tsx
  modified:
    - src/app/(dashboard)/layout.tsx
    - src/components/layout/dashboard-header.tsx

key-decisions:
  - "AbilityProvider wraps children at layout level for all dashboard pages"
  - "UserContext constructed from getClaimsForApiRoute (facilityId, clubId, roles, viewMode)"
  - "Header receives contexts prop for SSR hydration (faster initial render)"
  - "Legacy team display maintained for backward compatibility"
  - "Empty clubId string used for facility-only view mode"

patterns-established:
  - "Dashboard layout pattern: getClaimsForApiRoute -> AbilityProvider -> TeamColorProvider -> children"
  - "No-membership handling: redirect to /onboarding with join/create options"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 13 Plan 05: Dashboard Layout Integration Summary

**Dashboard layout wired with AbilityProvider and ContextSwitcher for facility auth integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T20:13:26Z
- **Completed:** 2026-01-23T20:17:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Wrapped dashboard children in AbilityProvider with UserContext
- Replaced ClubSwitcher with ContextSwitcher in dashboard header
- Added SSR context hydration for header (facility, clubs, currentContext)
- Created /onboarding page for users without any memberships
- Maintained backward compatibility with legacy team-only display

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: Layout + Header integration** - `73d135a` (feat)
   - AbilityProvider wrapper in dashboard layout
   - ContextSwitcher in dashboard header
   - SSR context hydration

2. **Task 3: Onboarding page** - `3c29a04` (feat)
   - Onboarding page for no-membership users

## Files Created/Modified
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with AbilityProvider, contexts, onboarding redirect
- `src/components/layout/dashboard-header.tsx` - Header using ContextSwitcher with contexts prop
- `src/app/(auth)/onboarding/page.tsx` - Onboarding page for users without memberships

## Decisions Made

**1. AbilityProvider placement**
- Wraps children at root of dashboard layout
- Every dashboard page gets CASL abilities via context
- UserContext includes: userId, facilityId, clubId, roles, viewMode

**2. SSR context hydration**
- Contexts fetched server-side in layout
- Passed to header as initialContexts prop
- ContextSwitcher uses hydrated data (no client fetch on initial load)

**3. No-membership handling**
- Check for !clubId && !facilityId after auth validation
- Redirect to /onboarding (not /login)
- Onboarding shows join/create club options

**4. Backward compatibility**
- Legacy team prop still supported in DashboardHeader
- Falls back to team display if no contexts provided
- ClubSwitcher still available (not removed, just not used)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- All dashboard pages now have CASL abilities via React context
- FACILITY_ADMIN users can switch between facility and club views
- Permission checks via useAbility hook or Can component
- Facility dashboard routes (/facility/[slug])

**Testing checklist:**
- [ ] User with club membership sees club in header
- [ ] User with multiple clubs can switch between them
- [ ] FACILITY_ADMIN sees facility option in dropdown
- [ ] User with no memberships redirects to /onboarding
- [ ] AbilityProvider provides correct permissions per viewMode

---
*Phase: 13-facility-auth-integration*
*Completed: 2026-01-23*
