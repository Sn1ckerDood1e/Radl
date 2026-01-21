---
phase: 02-practice-scheduling
plan: 03
subsystem: api
tags: [equipment, readiness, availability, damage-reports, prisma]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Equipment model with manualUnavailable fields, DamageReport model
provides:
  - Equipment readiness computation helper
  - Equipment API with isAvailable and unavailableReasons
  - Manual unavailability toggle for coaches
  - Available-only equipment filter
affects: [02-04, 03-lineups]

# Tech tracking
tech-stack:
  added: []
  patterns: [computed-properties-at-query-time]

key-files:
  created:
    - src/lib/equipment/readiness.ts
  modified:
    - src/app/api/equipment/route.ts
    - src/app/api/equipment/[id]/route.ts
    - src/lib/validations/equipment.ts

key-decisions:
  - "Availability computed at query time, not stored"
  - "Open damage reports automatically mark equipment unavailable"
  - "Manual note cleared when marking available"

patterns-established:
  - "Computed properties: Derive status from related records at query time"
  - "Readiness helper: Centralize availability logic in lib/equipment/readiness.ts"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 2 Plan 3: Equipment Readiness Summary

**Equipment API returns computed availability from damage reports and manual override, with filter for available-only equipment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T13:16:11Z
- **Completed:** 2026-01-21T13:18:43Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Equipment list shows availability status with reasons (EQUIP-02)
- Unavailable reasons show both damage reports and manual override
- Coach can mark equipment manually unavailable via PATCH
- Filter available-only equipment for practice planning

## Task Commits

Each task was committed atomically:

1. **Task 1: Create equipment readiness computation helper** - `dfeaf78` (feat)
2. **Task 2: Update equipment list API to include readiness** - `583f2da` (feat)
3. **Task 3: Update equipment detail API for manual unavailability** - `7d44f84` (feat)

## Files Created/Modified

- `src/lib/equipment/readiness.ts` - Readiness computation with EquipmentWithReadiness type
- `src/app/api/equipment/route.ts` - GET includes open damage reports, computes readiness
- `src/app/api/equipment/[id]/route.ts` - GET/PATCH with readiness, manual unavailability
- `src/lib/validations/equipment.ts` - Added manualUnavailable fields to update schema

## Decisions Made

- **Availability computed at query time:** Not stored as a field, derived from manualUnavailable flag and open damage report count
- **Manual note auto-cleared:** When setting manualUnavailable to false, manualUnavailableNote is set to null
- **Detail view includes full history:** GET /equipment/[id] returns full damage report history plus computed readiness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Equipment readiness API complete, ready for UI integration
- Practice planning can filter available equipment via ?available=true
- Damage reporting (02-04) can build on this foundation

---
*Phase: 02-practice-scheduling*
*Completed: 2026-01-21*
