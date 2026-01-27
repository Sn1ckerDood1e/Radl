---
phase: 21-equipment-readiness
plan: 01
subsystem: database
tags: [prisma, postgres, equipment, readiness, inspection]

# Dependency graph
requires:
  - phase: 20-public-issue-reporting
    provides: DamageReport model with severity and public reporting fields
provides:
  - Equipment.lastInspectedAt field for tracking inspection dates
  - TeamSettings readiness threshold configuration (14/21/30 day defaults)
  - DamageReport maintenance workflow fields (resolutionNote, archivedAt)
affects: [21-02-readiness-calculation, 21-03-equipment-badges, 21-04-maintenance-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Configurable threshold defaults in TeamSettings"
    - "Nullable inspection date (null = never inspected)"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/generated/prisma/index.d.ts

key-decisions:
  - "Equipment with null lastInspectedAt will show OUT_OF_SERVICE status until first inspection"
  - "MINOR damage reports get archived after resolution, CRITICAL/MODERATE kept forever"
  - "Default readiness thresholds: 14 days (yellow), 21 days (amber), 30 days (red)"

patterns-established:
  - "Equipment readiness: threshold-based calculation on inspection age"
  - "Maintenance workflow: minimal two-state (OPEN/RESOLVED) with optional resolution notes"

# Metrics
duration: 2min
completed: 2026-01-27
---

# Phase 21 Plan 01: Equipment Readiness Schema Summary

**Prisma schema extended with inspection tracking, configurable readiness thresholds, and maintenance workflow fields**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-27T01:32:24Z
- **Completed:** 2026-01-27T01:33:55Z
- **Tasks:** 4
- **Files modified:** 1 (plus generated Prisma client)

## Accomplishments
- Added Equipment.lastInspectedAt field (nullable DateTime for inspection tracking)
- Added TeamSettings readiness threshold configuration with 14/21/30 day defaults
- Extended DamageReport with resolutionNote and archivedAt for maintenance workflow
- Generated Prisma client with all new TypeScript types

## Task Commits

Schema changes committed atomically:

1. **Tasks 1-4: Schema extensions and generation** - `5e7e5d0` (feat)
   - Equipment.lastInspectedAt field
   - TeamSettings readiness thresholds (readinessInspectSoonDays, readinessNeedsAttentionDays, readinessOutOfServiceDays)
   - DamageReport.resolutionNote and archivedAt fields
   - Prisma client regenerated (gitignored)

## Files Created/Modified
- `prisma/schema.prisma` - Added 6 new fields across 3 models for equipment readiness
- `src/generated/prisma/index.d.ts` - Generated TypeScript types for new fields (gitignored)

## Decisions Made

**1. Null inspection date semantics**
- Equipment with `lastInspectedAt = null` means "never inspected"
- Per CONTEXT.md, this will trigger OUT_OF_SERVICE status until first inspection
- Intentional design: forces coaches to establish inspection baseline

**2. Archive retention by severity**
- CRITICAL and MODERATE damage reports kept forever (equipment lifecycle history)
- MINOR reports archived after resolution (archivedAt timestamp set)
- Supports equipment history tracking while reducing clutter

**3. Default threshold values**
- 14 days: INSPECT_SOON (yellow warning)
- 21 days: NEEDS_ATTENTION (amber alert)
- 30 days: OUT_OF_SERVICE (red, must inspect)
- Values from CONTEXT.md user discussion, configurable per team in settings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Migration environment issue**
- `prisma migrate dev` failed in non-interactive environment
- Solution: Used `prisma db push` and `prisma generate` as suggested in task instructions
- Database schema synchronized successfully, Prisma client regenerated
- No data loss, all fields added with correct defaults

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 21-02 (readiness calculation logic):**
- All required database fields in place
- TeamSettings thresholds available for calculation
- DamageReport fields ready for status determination

**Ready for 21-03 (equipment badges):**
- Schema supports badge display requirements
- Inspection date and threshold data available for UI

**Ready for 21-04 (maintenance workflow):**
- resolutionNote and archivedAt fields ready for resolution UI
- Severity-based archive logic can be implemented

**No blockers or concerns.**

---
*Phase: 21-equipment-readiness*
*Completed: 2026-01-27*
