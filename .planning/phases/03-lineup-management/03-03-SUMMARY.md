---
phase: 03-lineup-management
plan: 03
subsystem: backend
tags: [equipment, usage-logging, api, automation]

# Dependency graph
requires:
  - phase: 03-lineup-management
    plan: 01
    provides: EquipmentUsageLog model
  - phase: 03-lineup-management
    plan: 02
    provides: Lineup CRUD API endpoints
provides:
  - Automatic equipment usage logging on boat assignment
  - Usage log helper functions (create, delete, query)
  - Team-wide and equipment-specific usage query APIs
affects: [03-04-template-system, 02-equipment-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotent usage log creation (won't duplicate for same equipment + practice)"
    - "Usage logs as supplementary data (failures logged but don't fail main operation)"
    - "Denormalized teamId for efficient team-scoped queries"

key-files:
  created:
    - src/lib/equipment/usage-logger.ts
    - src/app/api/equipment-usage/route.ts
    - src/app/api/equipment/[id]/usage/route.ts
  modified:
    - src/app/api/lineups/route.ts
    - src/app/api/lineups/[id]/route.ts
    - src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts

key-decisions:
  - "Usage logs created automatically on boat assignment (no manual tracking needed)"
  - "Usage log operations wrapped in try-catch (supplementary, non-blocking)"
  - "Idempotent createUsageLog prevents duplicate logs for same equipment + practice"
  - "Usage logs deleted when lineup deleted or boat unassigned"
  - "Equipment-specific endpoint includes summary statistics (totalUses, lastUsed)"

patterns-established:
  - "Automatic resource usage tracking: createUsageLog called after boat assignment"
  - "Supplementary data pattern: usage log failures don't block primary operations"
  - "Date range filtering: startDate/endDate query params for historical analysis"
  - "Summary statistics: computed aggregates in query responses"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 3 Plan 03: Equipment Usage Logging Summary

**Auto-generated usage logs when boats assigned to lineups, queryable by equipment and team with date filtering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T18:05:23Z
- **Completed:** 2026-01-21T18:09:06Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 3

## Accomplishments
- Created usage logging helper functions with idempotent create/update logic
- Integrated automatic usage logging into all lineup API endpoints
- Built query APIs for team-wide and equipment-specific usage history
- Implemented date range filtering and summary statistics
- Completed EQUIP-01 requirement (auto-generate usage logs from practice assignments)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create usage logging helper functions** - `cb0ebd2` (feat)
   - createUsageLog: idempotent create/update for equipment usage
   - deleteUsageLogForLineup: cleanup when lineup deleted
   - getUsageLogsForEquipment: equipment-specific history with date filtering
   - getUsageLogsForTeam: team-wide usage logs with equipment details

2. **Task 2: Integrate usage logging into lineup API** - `1fce80b` (feat)
   - POST /api/lineups: create usage log when boat assigned
   - PATCH /api/lineups/[id]: handle boat changes (null→value, value→null, value→different)
   - DELETE /api/lineups/[id]: cleanup usage logs before deletion
   - PUT /api/practices/[id]/blocks/[blockId]/lineup: replace-all pattern with usage log handling

3. **Task 3: Create usage log query API endpoints** - `7409c21` (feat)
   - GET /api/equipment-usage: team-wide usage logs with equipment details
   - GET /api/equipment/[id]/usage: equipment-specific usage history with summary statistics

## Files Created/Modified

**Created:**
- `src/lib/equipment/usage-logger.ts` - Helper functions for creating, deleting, and querying usage logs
- `src/app/api/equipment-usage/route.ts` - Team-wide usage log listing with filtering
- `src/app/api/equipment/[id]/usage/route.ts` - Equipment-specific usage history with summary stats

**Modified:**
- `src/app/api/lineups/route.ts` - Added usage log creation on POST when boat assigned
- `src/app/api/lineups/[id]/route.ts` - Added usage log handling for boat changes in PATCH and cleanup in DELETE
- `src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts` - Added usage log handling for replace-all pattern in PUT

## Decisions Made

**Idempotent usage log creation**
- Rationale: Prevent duplicate logs if API called multiple times with same data
- Implementation: Check for existing log by equipmentId + practiceId, update lineupId if different
- Alternative considered: Allow duplicates (rejected - creates data integrity issues)

**Usage logs as supplementary data**
- Rationale: Usage tracking shouldn't break primary lineup operations
- Implementation: All createUsageLog/deleteUsageLogForLineup calls wrapped in try-catch with warning logs
- Pattern: Primary operation completes successfully even if usage log fails

**Summary statistics in equipment endpoint**
- Rationale: Common queries (total uses, last used) shouldn't require client-side aggregation
- Implementation: Calculate totalUses (count) and lastUsed (first log date) in response
- Supports: Equipment maintenance scheduling, boat rotation planning

**Date range filtering**
- Rationale: Historical analysis requires filtering by time period
- Implementation: Optional startDate/endDate query params, applied to usageDate field
- Supports: Season reports, equipment utilization analysis

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation, API integration, and usage log operations all succeeded without issues.

## Next Phase Readiness

**Ready for Phase 3 Plan 04 (Lineup Templates):**
- Usage logging infrastructure in place for template-applied lineups
- Helper functions available for template system to use when creating lineups
- Query APIs ready for historical lineup analysis

**Ready for future Equipment Analytics features:**
- Usage log data foundation complete for maintenance scheduling
- Date range queries support seasonal utilization reports
- Equipment-specific history supports rotation planning

**No blockers.**

**Considerations for next plans:**
- Template application should trigger usage logging automatically (already handled via lineup API)
- UI can display usage statistics from GET /api/equipment/[id]/usage endpoint
- Future: Consider adding boat-hours calculation based on practice duration

## Requirement Completion

**EQUIP-01: Auto-generate usage logs from practice assignments**
- ✅ Usage logs automatically created when boat assigned to lineup
- ✅ Usage logs automatically updated when boat changed
- ✅ Usage logs automatically deleted when boat unassigned or lineup deleted
- ✅ Queryable by equipment and by team
- ✅ Date range filtering for historical analysis

---
*Phase: 03-lineup-management*
*Completed: 2026-01-21*
