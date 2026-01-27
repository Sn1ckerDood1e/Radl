---
phase: 23-dashboard-enhancements
plan: 05
subsystem: api
tags: [prisma, dashboard, queries, data-fetching]

# Dependency graph
requires:
  - phase: 23-01
    provides: Sparkline component for usage visualization
  - phase: 23-02
    provides: Fleet health widget with readiness calculation
  - phase: 23-03
    provides: NextPracticeWidget and UsageTrendsWidget components
provides:
  - getTodaysPracticesForCoach function for coach dashboard
  - getAthleteNextPractice function for athlete dashboard
  - getAttentionItems function for coach alerts
  - getUsageTrendsData function for usage sparkline
affects: [23-06, dashboard-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [date-string-comparison, filtered-includes]

key-files:
  created:
    - src/lib/dashboard/queries.ts
  modified: []

key-decisions:
  - "Date string comparison for 'today' using toISOString().split('T')[0] to avoid timezone issues"
  - "Filtered includes pattern for getAthleteNextPractice to avoid N+1 queries"
  - "Athlete count computed by unique Set across all blocks (water seats + land assignments)"
  - "14-day lookahead window for practices needing lineups attention item"

patterns-established:
  - "Dashboard queries: Centralized in queries.ts, called from page server component"
  - "Attention items: Type-safe union with href links for navigation"

# Metrics
duration: 2min
completed: 2026-01-27
---

# Phase 23 Plan 05: Dashboard Queries Summary

**Dashboard data fetching functions with coach practices/attention items and athlete next practice queries using timezone-safe date comparison and filtered includes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-27T15:45:16Z
- **Completed:** 2026-01-27T15:47:21Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Created getTodaysPracticesForCoach with athlete count aggregation and fallback to next practice
- Created getAttentionItems for equipment readiness alerts and practices needing lineups
- Created getUsageTrendsData for sparkline widget using season date range
- Created getAthleteNextPractice with filtered includes for efficient single-query athlete assignment lookup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coach dashboard queries** - `9231f2e` (feat)
2. **Task 2: Create athlete dashboard query** - `ce58d24` (feat)

## Files Created/Modified

- `src/lib/dashboard/queries.ts` - Dashboard data fetching functions for coach and athlete dashboards

## Decisions Made

- **Date string comparison:** Used `toISOString().split('T')[0]` for "today" comparison to avoid timezone issues (per RESEARCH.md pitfall #1)
- **Filtered includes:** Used Prisma's `where` clause within includes for getAthleteNextPractice to filter seats/assignments to current athlete, avoiding N+1 queries
- **Athlete count aggregation:** Used Set to compute unique athletes across water block lineups and land assignments
- **14-day lookahead:** Attention items query practices needing lineups within 14 days
- **Block title as group name:** For land/erg assignments, used block.title as the groupName in assignment response

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard query functions ready for page integration in 23-06
- All four functions exported and typed for server component use
- Follows established patterns from aggregations.ts

---
*Phase: 23-dashboard-enhancements*
*Completed: 2026-01-27*
