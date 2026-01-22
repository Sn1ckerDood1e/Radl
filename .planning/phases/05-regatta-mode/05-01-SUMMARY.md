---
phase: 05-regatta-mode
plan: 01
subsystem: database
tags: [prisma, regatta, entry, lineup, oauth, zod]

# Dependency graph
requires:
  - phase: 03-lineup-management
    provides: Lineup, SeatAssignment models and patterns
  - phase: 04-pwa-infrastructure
    provides: Push notification infrastructure for race alerts
provides:
  - Regatta model extended with source, venue, timezone, rcRegattaId
  - Entry model for race entries with scheduling and status tracking
  - EntryLineup and EntrySeat for race lineup assignments
  - NotificationConfig for scheduled race notifications
  - RegattaCentralConnection for OAuth token storage
  - Zod validation schemas matching API contracts
affects: [05-02 regatta CRUD, 05-03 entry management, 05-04 RC import, 05-05 race notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Entry-Regatta cascade pattern (regattaId FK with onDelete Cascade)
    - Unique RC ID constraint (teamId + rcRegattaId composite unique)
    - Encrypted token storage pattern (encryptedToken, refreshToken fields)

key-files:
  created:
    - src/lib/validations/regatta.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Unique constraint on teamId+rcRegattaId allows null rcRegattaId for manual regattas"
  - "EntryLineup separate from Entry for optional lineup assignment"
  - "NotificationConfig 1:1 with Entry for per-race notification settings"

patterns-established:
  - "Entry lineup mirrors practice lineup pattern (EntryLineup/EntrySeat like Lineup/SeatAssignment)"
  - "Encrypted OAuth tokens stored per team (RegattaCentralConnection.encryptedToken)"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 5 Plan 1: Regatta Data Models Summary

**Extended Prisma schema with Regatta, Entry, EntryLineup, EntrySeat, NotificationConfig, and RegattaCentralConnection models plus Zod validation schemas**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T03:00:38Z
- **Completed:** 2026-01-22T03:03:32Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Extended Regatta model with source (MANUAL/REGATTA_CENTRAL), venue, timezone, and RC sync tracking
- Created Entry model for race events with scheduling, meeting info, and status tracking
- Added EntryLineup and EntrySeat for race lineup assignments (mirrors practice lineup pattern)
- Added NotificationConfig for per-race notification scheduling with configurable lead time
- Added RegattaCentralConnection for team OAuth token storage
- Created Zod validation schemas with duplicate athlete/position refinements

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with regatta data models** - `f04a06c` (feat)
2. **Task 2: Generate Prisma client and create validation schemas** - `9cdbeb1` (feat)
3. **Task 3: Run database migration** - No commit (runtime db operation)

## Files Created/Modified

- `prisma/schema.prisma` - Added RegattaSource, EntryStatus enums; extended Regatta model; added Entry, EntryLineup, EntrySeat, NotificationConfig, RegattaCentralConnection models
- `src/lib/validations/regatta.ts` - Zod schemas for create/update regatta, entry, entry lineup, notification config

## Decisions Made

- **Unique constraint on teamId+rcRegattaId:** Allows null rcRegattaId for manual regattas while ensuring uniqueness for RC imports
- **EntryLineup separate from Entry:** Lineup assignment is optional and can be added later
- **NotificationConfig 1:1 with Entry:** Each race entry can have its own notification settings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Prisma db push warning:** Unique constraint on `[teamId, rcRegattaId]` triggered data loss warning since existing rows have null rcRegattaId. Used `--accept-data-loss` flag since nulls are unique-compatible.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Regatta data models ready for API development (05-02)
- Entry model supports both manual creation and RC import
- EntryLineup/EntrySeat patterns match practice lineup for UI reuse
- NotificationConfig ready for race alert scheduling
- RegattaCentralConnection ready for OAuth implementation

---
*Phase: 05-regatta-mode*
*Completed: 2026-01-22*
