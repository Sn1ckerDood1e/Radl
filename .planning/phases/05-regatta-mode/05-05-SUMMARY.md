---
phase: 05-regatta-mode
plan: 05
subsystem: ui
tags: [react, date-fns-tz, timezone, timeline, regatta]

# Dependency graph
requires:
  - phase: 05-02
    provides: Regatta and Entry CRUD API endpoints
  - phase: 05-04
    provides: Entry lineup and notification config API
provides:
  - RaceTimeline component for race schedule display
  - EntryCard component for timeline items
  - Regatta list page with upcoming/past grouping
  - Regatta create/edit form with timezone selection
  - Regatta detail page with timeline view
affects: [05-06, 05-07]

# Tech tracking
tech-stack:
  added: [date-fns-tz]
  patterns: [timeline-grouping, venue-timezone-display]

key-files:
  created:
    - src/components/regatta/entry-card.tsx
    - src/components/regatta/race-timeline.tsx
    - src/components/regatta/regatta-form.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/page.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/new/page.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/[id]/page.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/[id]/regatta-detail-client.tsx
  modified:
    - package.json

key-decisions:
  - "date-fns-tz for venue timezone: formatInTimeZone displays race times in regatta venue timezone"
  - "Timeline groups entries by date with sticky headers"
  - "Next upcoming entry highlighted with blue border"
  - "Dark theme styling consistent with existing app UI"

patterns-established:
  - "Venue timezone display: Use formatInTimeZone with regatta.timezone for all race times"
  - "Timeline grouping: Group by date, sort by scheduledTime, sticky date headers"
  - "Entry status colors: Scheduled=default, Next=blue, Scratched=dimmed, Completed=green"

# Metrics
duration: 6min
completed: 2026-01-22
---

# Phase 05 Plan 05: Timeline View UI Summary

**Race timeline UI with date-fns-tz venue timezone support, entry cards showing lineup/notification status, and regatta list/detail pages**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-22T03:12:23Z
- **Completed:** 2026-01-22T03:18:54Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Installed date-fns-tz for venue timezone formatting
- Created EntryCard component displaying race time, event name, lineup summary, and notification status
- Created RaceTimeline component grouping entries by date with sticky headers
- Built regatta list page with upcoming/past sections and season filtering
- Built regatta create page with RegattaForm supporting timezone selection
- Built regatta detail page integrating RaceTimeline with interactive entry navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install date-fns-tz and create timeline components** - `717c6d1` (feat)
2. **Task 2: Create regatta list and create pages** - `6e8111b` (feat)
3. **Task 3: Create regatta detail page with timeline** - `ac45d44` (feat)

## Files Created/Modified

- `src/components/regatta/entry-card.tsx` - Entry card component with race time, event name, lineup and notification status
- `src/components/regatta/race-timeline.tsx` - Timeline component grouping entries by date with venue timezone
- `src/components/regatta/regatta-form.tsx` - Form component for create/edit regatta with timezone selection
- `src/app/(dashboard)/[teamSlug]/regattas/page.tsx` - Regatta list page with upcoming/past grouping
- `src/app/(dashboard)/[teamSlug]/regattas/new/page.tsx` - New regatta page with form
- `src/app/(dashboard)/[teamSlug]/regattas/[id]/page.tsx` - Regatta detail server component
- `src/app/(dashboard)/[teamSlug]/regattas/[id]/regatta-detail-client.tsx` - Interactive client component with timeline
- `package.json` - Added date-fns-tz dependency

## Decisions Made

- **date-fns-tz for timezone**: Uses `formatInTimeZone` to display race times in venue timezone, critical for regattas in different locations
- **Timeline grouping by date**: Multi-day regattas have entries grouped by date with sticky headers showing which timezone is displayed
- **Next entry highlighting**: The next upcoming SCHEDULED entry gets a blue border to help coaches quickly identify the current race
- **Dark theme consistency**: All new components styled with zinc color palette matching existing app UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated components for dark theme styling**
- **Found during:** Task 3 (Creating detail page)
- **Issue:** Plan template used light theme colors (bg-white, text-gray-*) incompatible with app's dark theme
- **Fix:** Updated EntryCard and RaceTimeline to use dark theme colors (bg-zinc-*, text-zinc-*, border-zinc-*)
- **Files modified:** src/components/regatta/entry-card.tsx, src/components/regatta/race-timeline.tsx
- **Verification:** Visual consistency with existing app UI
- **Committed in:** ac45d44 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for UI consistency. No scope creep.

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- REG-03 (timeline view) requirement satisfied
- Ready for 05-06 (notification dispatch) which will trigger notifications based on entry schedule
- Ready for 05-07 (calendar integration) which will show regattas in unified calendar

---
*Phase: 05-regatta-mode*
*Completed: 2026-01-22*
