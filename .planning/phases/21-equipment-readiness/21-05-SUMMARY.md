---
phase: 21-equipment-readiness
plan: 05
subsystem: equipment
tags: [equipment, dashboard, widget, typescript, react]

# Dependency graph
requires:
  - phase: 21-02
    provides: aggregateFleetHealth function, ReadinessStatus type
  - phase: 21-03
    provides: ReadinessBadge component (styling reference)
provides:
  - FleetHealthWidget component for dashboard
  - At-a-glance equipment readiness status visibility
  - Coach-only fleet health monitoring
affects: [21-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [dashboard widget pattern, empty state with action, health bar visualization]

key-files:
  created: [src/components/equipment/fleet-health-widget.tsx]
  modified: [src/app/(dashboard)/[teamSlug]/page.tsx]

key-decisions:
  - "Widget visible only to coaches (equipment management is coach responsibility)"
  - "Empty state shows 'Add equipment' link when no equipment registered"
  - "Action prompt appears when OUT_OF_SERVICE or NEEDS_ATTENTION items exist"
  - "Widget placed between announcements and practices per CONTEXT.md guidance"

patterns-established:
  - "Status order display: most severe first (OUT_OF_SERVICE → NEEDS_ATTENTION → INSPECT_SOON → READY)"
  - "Health bar with proportional color-coded segments for visual summary"
  - "2x2 grid layout for status counts with icons and labels"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 21 Plan 05: Fleet Health Dashboard Widget Summary

**At-a-glance fleet health widget showing equipment readiness status breakdown with visual indicators and action prompts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T01:44:03Z
- **Completed:** 2026-01-27T01:46:46Z
- **Tasks:** 2
- **Files created:** 1
- **Files modified:** 1

## Accomplishments
- FleetHealthWidget component with empty state for teams without equipment
- Health summary bar showing ready percentage with color-coded segments
- 2x2 grid of status counts (OUT_OF_SERVICE, NEEDS_ATTENTION, INSPECT_SOON, READY)
- Action prompt linking to equipment page when items need attention
- Dashboard integration with coach-only visibility
- Parallel data fetching for equipment and team settings
- Custom threshold support from team settings or defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FleetHealthWidget component** - `060c1a8` (feat)
2. **Task 2: Integrate FleetHealthWidget into team dashboard** - `c47661e` (feat)

## Files Created/Modified
- `src/components/equipment/fleet-health-widget.tsx` - Created FleetHealthWidget component with status breakdown, health bar, empty state, action prompt
- `src/app/(dashboard)/[teamSlug]/page.tsx` - Added equipment and settings queries, fleet health calculation, widget rendering for coaches

## Decisions Made

**Widget visibility scoped to coaches:**
- Equipment management is a coach responsibility per system design
- Athletes don't need fleet health visibility (they see equipment availability when creating lineups)
- Follows same pattern as open damage report alert (coach-only)

**Empty state with action:**
- Shows "No equipment registered" message when totalEquipment === 0
- Provides "Add equipment" link to jump directly to equipment creation
- Prevents confusing display of 0/0 status counts

**Status order prioritizes issues:**
- Display order: OUT_OF_SERVICE → NEEDS_ATTENTION → INSPECT_SOON → READY
- Shows problems first (most severe to least) for coach attention
- Health bar uses same order for left-to-right visual scanning

**Action prompt appears conditionally:**
- Shows "X item(s) need attention" when OUT_OF_SERVICE or NEEDS_ATTENTION count > 0
- Links directly to equipment list page for quick access
- Uses amber color matching NEEDS_ATTENTION severity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following established dashboard widget patterns.

## User Setup Required

None - widget automatically displays on coach dashboards using existing equipment data.

## Next Phase Readiness

Ready for Phase 21-06 (Settings UI):
- Dashboard widget shows default thresholds (14/21/30 days)
- Widget will automatically reflect custom thresholds when user configures them
- Fleet health calculation already uses teamSettings.readiness* fields
- No changes needed to dashboard code when settings UI completes

No blockers or concerns.

---
*Phase: 21-equipment-readiness*
*Completed: 2026-01-27*
