---
phase: 17-facility-ui-features
plan: 03
subsystem: ui
tags: [nextjs, prisma, facility-admin, clubs, drill-down]

# Dependency graph
requires:
  - phase: 17-02
    provides: "Facility dashboard with navigation cards"
  - phase: 13-facility-auth-integration
    provides: "viewMode-based permissions and context switching"
provides:
  - "Clubs list page for facility admins"
  - "Drill-down navigation from facility to club dashboards"
  - "Club stats display (members, equipment, practices)"
affects: [17-04, 17-05, facility-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Facility admin pages follow viewMode='facility' check pattern"
    - "Drill-down links navigate to /{clubSlug} for full admin access"
    - "Empty state pattern for zero-data scenarios"

key-files:
  created:
    - src/app/(dashboard)/facility/[facilitySlug]/clubs/page.tsx
    - src/app/(dashboard)/facility/[facilitySlug]/clubs/loading.tsx
  modified: []

key-decisions:
  - "Drill-down links go to /{clubSlug} for facility admins to access full club dashboard with admin capabilities"
  - "Club stats include practices count in addition to members and equipment"

patterns-established:
  - "Clubs displayed in alphabetical order by name"
  - "Loading skeleton mirrors content grid layout (3 columns on large screens)"
  - "Empty state uses EmptyState component with Building2 icon"

# Metrics
duration: 2min
completed: 2026-01-25
---

# Phase 17 Plan 03: Clubs List Page Summary

**Facility admins can view all clubs with drill-down navigation to club dashboards with full admin access**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-25T18:16:27Z
- **Completed:** 2026-01-25T18:18:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created clubs list page with auth checks for FACILITY_ADMIN role
- Added extended club stats display (members, equipment, practices)
- Implemented drill-down navigation to club dashboards
- Added loading skeleton matching grid layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create clubs list page** - `2a7014b` (feat)
2. **Task 2: Add loading skeleton for clubs page** - `60ea699` (feat)

## Files Created/Modified
- `src/app/(dashboard)/facility/[facilitySlug]/clubs/page.tsx` - Clubs list page with auth checks, stats query, and drill-down links
- `src/app/(dashboard)/facility/[facilitySlug]/clubs/loading.tsx` - Loading skeleton for clubs grid

## Decisions Made
- Drill-down links navigate to `/{clubSlug}` (club dashboard) instead of facility-specific club view, giving facility admins full admin access to clubs
- Included practices count in club stats to show activity level
- Used alphabetical ordering by name for consistent club browsing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Clubs list page complete with drill-down navigation
- Ready for facility equipment list page (Plan 04)
- Facility admin can access any club dashboard with full admin capabilities (viewMode-based permissions from Phase 13)

---
*Phase: 17-facility-ui-features*
*Completed: 2026-01-25*
