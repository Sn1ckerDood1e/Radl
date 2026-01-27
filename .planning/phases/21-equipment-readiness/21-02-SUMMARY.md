---
phase: 21-equipment-readiness
plan: 02
subsystem: equipment
tags: [equipment, readiness, typescript, prisma]

# Dependency graph
requires:
  - phase: 21-01
    provides: Equipment.lastInspectedAt field, TeamSettings threshold fields, DamageReport severity enum
provides:
  - Threshold-based readiness calculation library
  - ReadinessStatus type and calculation functions
  - Batch processing helpers for list pages and dashboard
affects: [21-03, 21-04, 21-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [compute-on-read readiness calculation, priority-based status algorithm]

key-files:
  created: []
  modified: [src/lib/equipment/readiness.ts]

key-decisions:
  - "Priority order: manual override → critical damage → inspection days → moderate damage → ready"
  - "Null lastInspectedAt treated as OUT_OF_SERVICE with 'No inspection record' reason"
  - "Default thresholds: 14d (INSPECT_SOON), 21d (NEEDS_ATTENTION), 30d (OUT_OF_SERVICE)"

patterns-established:
  - "calculateDaysSince helper: null-safe date difference calculation"
  - "Batch processing pattern: generic types preserve equipment object shape"
  - "Aggregate fleet health: reduce status counts for dashboard widgets"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 21 Plan 02: Threshold-Based Readiness Calculation Summary

**Threshold-based readiness calculation with 4-level status (READY/INSPECT_SOON/NEEDS_ATTENTION/OUT_OF_SERVICE) using team-configurable day thresholds**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T01:37:07Z
- **Completed:** 2026-01-27T01:39:59Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- ReadinessStatus type with 4 traffic-light status levels
- calculateReadinessStatus function with priority-ordered logic
- Batch processing helpers for list pages (calculateMultipleReadinessStatus)
- Fleet health aggregation for dashboard widget (aggregateFleetHealth)
- Null-safe handling for never-inspected equipment

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ReadinessStatus type and threshold interface** - `60bfc87` (feat)
2. **Task 2: Implement calculateReadinessStatus function** - `90841ab` (feat)
3. **Task 3: Add batch calculation helper** - `6e36547` (feat)

## Files Created/Modified
- `src/lib/equipment/readiness.ts` - Extended with threshold-based readiness calculation, ReadinessStatus type, batch processing helpers

## Decisions Made

**Priority order enforcement:**
- Manual override checked FIRST (absolute precedence)
- Then CRITICAL damage reports (immediate OUT_OF_SERVICE)
- Then time thresholds from most to least severe (30d → 21d → 14d)
- Then MODERATE damage reports combined with time checks
- Prevents lower-severity conditions from masking critical issues

**Null handling for lastInspectedAt:**
- Treated as "never inspected" → OUT_OF_SERVICE
- Returns "No inspection record" as reason
- Ensures new equipment requires explicit inspection before use

**Batch processing design:**
- Generic types (`<T extends EquipmentForReadiness>`) preserve equipment object shape
- Allows extending results with readiness property without losing type information
- Fleet health aggregation uses reduce pattern for dashboard performance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following research patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 21-03:
- ReadinessStatus type exported for badge component styling
- calculateReadinessStatus function ready for UI integration
- aggregateFleetHealth function ready for dashboard widget
- All existing exports preserved (computeEquipmentReadiness maintained for backward compatibility)

No blockers or concerns.

---
*Phase: 21-equipment-readiness*
*Completed: 2026-01-27*
