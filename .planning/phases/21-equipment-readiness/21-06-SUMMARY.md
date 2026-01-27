---
phase: 21-equipment-readiness
plan: 06
subsystem: ui
tags: [settings, team-settings, readiness, thresholds, react, api]

# Dependency graph
requires:
  - phase: 21-01
    provides: "Schema extensions for readiness thresholds (readinessInspectSoonDays, readinessNeedsAttentionDays, readinessOutOfServiceDays)"
  - phase: 21-02
    provides: "Readiness calculation logic that uses threshold values"
provides:
  - "Team settings API GET/PATCH support for readiness threshold fields"
  - "Settings page UI for configuring inspection thresholds"
  - "Default threshold values (14, 21, 30 days)"
affects: [settings, equipment-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Number input form pattern for threshold configuration"]

key-files:
  created: []
  modified:
    - "src/app/api/team-settings/route.ts"
    - "src/app/(dashboard)/[teamSlug]/settings/page.tsx"

key-decisions:
  - "Threshold inputs accept numbers 1-365 with validation in API schema"
  - "Threshold values default to 14/21/30 days when not set"
  - "Threshold changes affect equipment status immediately (server-rendered on next load)"

patterns-established:
  - "Settings sections follow consistent card layout with save button and success message"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 21 Plan 06: Readiness Threshold Settings Summary

**Team settings API and UI for configuring inspection thresholds (14/21/30 day defaults)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T01:43:54Z
- **Completed:** 2026-01-27T01:46:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Team settings API returns readiness threshold fields with defaults (14, 21, 30)
- API validates threshold values (1-365 days) and persists via upsert
- Settings page has Equipment Readiness Thresholds section with 3 number inputs
- Threshold changes immediately affect equipment status calculation on next page load

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend team settings API with readiness threshold fields** - `6342d3d` (feat)
2. **Task 2: Add readiness threshold settings section to settings page** - `d074d1c` (feat)

## Files Created/Modified
- `src/app/api/team-settings/route.ts` - Added readinessInspectSoonDays, readinessNeedsAttentionDays, readinessOutOfServiceDays validation and PATCH handler
- `src/app/(dashboard)/[teamSlug]/settings/page.tsx` - Added Equipment Readiness Thresholds section with state, save handler, and UI

## Decisions Made
- Threshold values validated at API level (1-365 days) using Zod schema
- Default values provided via nullish coalescing (14, 21, 30) for teams without settings
- Threshold section placed after Team Colors, before Appearance Settings for logical grouping
- Success message auto-dismisses after 3 seconds matching existing patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Readiness threshold configuration complete
- Teams can now customize when equipment shows yellow/amber/red status
- Equipment list and dashboard widgets reflect configured thresholds immediately
- No blockers for future equipment readiness features

---
*Phase: 21-equipment-readiness*
*Completed: 2026-01-27*
