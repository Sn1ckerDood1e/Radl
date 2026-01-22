---
phase: 05-regatta-mode
plan: 04
subsystem: api
tags: [entry, lineup, notification, regatta, prisma, zod]

# Dependency graph
requires:
  - phase: 05-01
    provides: Regatta, Entry, EntryLineup, EntrySeat, NotificationConfig models and Zod schemas
  - phase: 03-lineup-management
    provides: Lineup patterns (delete-and-create, seat validation)
provides:
  - Entry lineup assignment API (GET/PUT/DELETE)
  - Entry notification config API (GET/PUT/PATCH/DELETE)
  - Notification time calculation (scheduledTime - leadTimeMinutes)
  - Past notification detection and warning
affects: [05-05 race notifications, 05-06 regatta UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Entry lineup mirrors practice lineup pattern (delete-and-create for PUT)
    - Notification scheduledFor calculated from race time minus lead time
    - Past notification handling (mark as sent, return warning)

key-files:
  created:
    - src/app/api/regattas/[id]/entries/[entryId]/lineup/route.ts
    - src/app/api/regattas/[id]/entries/[entryId]/notification/route.ts
  modified: []

key-decisions:
  - "DELETE-and-CREATE pattern for lineup PUT to avoid complex diffing"
  - "Past notifications marked as sent, warning returned to client"
  - "PATCH resets sentAt to allow re-scheduling after lead time change"

patterns-established:
  - "Entry lineup endpoint mirrors practice lineup pattern with replace-all PUT"
  - "Notification scheduledFor computed: scheduledTime - (leadTimeMinutes * 60 * 1000)"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 5 Plan 4: Entry Lineup and Notification Config API Summary

**Entry lineup API with boat/seat assignment and notification config API with automatic scheduledFor calculation from race time**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T03:05:47Z
- **Completed:** 2026-01-22T03:08:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created entry lineup API with GET/PUT/DELETE for assigning lineups to race entries
- Created notification config API with GET/PUT/PATCH/DELETE for configuring race notifications
- Implemented automatic notification time calculation from race scheduledTime minus leadTimeMinutes
- Added past notification detection with warning response (notifications in the past won't be sent)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create entry lineup API endpoints** - `359cad9` (feat)
2. **Task 2: Create entry notification configuration API** - `58e8bba` (feat)

## Files Created/Modified

- `src/app/api/regattas/[id]/entries/[entryId]/lineup/route.ts` - Entry lineup assignment with boat and seat validation
- `src/app/api/regattas/[id]/entries/[entryId]/notification/route.ts` - Notification config with scheduledFor calculation

## Decisions Made

- **DELETE-and-CREATE pattern for lineup PUT:** Follows practice lineup pattern - simpler than diffing existing seats, ensures clean state
- **Past notifications marked as sent:** Prevents confusing "scheduled" state for notifications that can never fire
- **PATCH resets sentAt to null:** Allows re-scheduling if coach changes lead time after notification was sent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Entry lineup API ready for UI integration in 05-06
- Notification config API ready for notification processing in 05-05
- scheduledFor field populated for cron/worker to query pending notifications
- REG-04 (lineup per entry) and REG-05 (notification config) requirements satisfied

---
*Phase: 05-regatta-mode*
*Completed: 2026-01-22*
