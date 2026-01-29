---
phase: 03-lineup-management
plan: 05
subsystem: ui
tags: [dnd-kit, drag-and-drop, lineup-editor, boat-selector, react, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: Lineup data models, position constants, validation schemas
  - phase: 03-02
    provides: Lineup CRUD API endpoints
  - phase: 03-04
    provides: Drag-and-drop components (AthleteCard, SeatSlot, AthleteRosterPanel)
provides:
  - Water lineup builder with drag-drop seat assignment
  - Boat selector with compatibility filtering
  - Lineup editor routing to water vs land builders
  - Double-booking warnings for boat conflicts
affects: [03-06, 03-07, 03-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Boat compatibility filtering by capacity and availability"
    - "Double-booking warning (non-blocking) for boat conflicts"
    - "Replace-all pattern for seat assignments on drag-drop"

key-files:
  created:
    - src/components/lineups/boat-selector.tsx
    - src/components/lineups/water-lineup-builder.tsx
  modified:
    - src/components/lineups/lineup-editor.tsx
    - src/app/api/lineup-templates/route.ts
    - src/app/api/lineup-templates/[id]/route.ts

key-decisions:
  - "BoatSelector filters by capacity matching lineup size (excluding cox)"
  - "Unavailable boats hidden from selection based on availability status"
  - "Double-booking warning shown but non-blocking (allows split squads)"
  - "Auto-remove athlete from previous seat when dropped to new position"
  - "Partial lineup warning shown when seats not fully assigned"

patterns-established:
  - "Boat selector pattern: Filter by capacity, availability, show warnings"
  - "Water lineup builder: DndContext with roster panel, seat grid, boat selector"
  - "Lineup editor routing: Type-based dispatch to water vs land builders"

# Metrics
duration: 9min
completed: 2026-01-21
---

# Phase 3 Plan 5: Water Lineup Editor Summary

**Drag-and-drop water lineup builder with boat compatibility filtering, auto-seat-removal, and double-booking warnings**

## Performance

- **Duration:** 9 min
- **Started:** 2026-01-21T18:11:27Z
- **Completed:** 2026-01-21T18:20:45Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created boat selector with capacity-based filtering and availability checks
- Built water lineup builder with full drag-drop seat assignment
- Integrated water builder into lineup editor with type-based routing
- Added double-booking warnings for boat conflicts (non-blocking)
- Implemented auto-removal of athlete from previous seat on drop

## Task Commits

Each task was committed atomically:

1. **Task 1: Create boat selector with compatibility filtering** - `76ab866` (feat)
2. **Task 2: Create water lineup builder with drag-drop** - `26419d2` (feat)
3. **Task 3: Create lineup editor wrapper component** - `4a08021` (feat)

## Files Created/Modified
- `src/components/lineups/boat-selector.tsx` - Boat dropdown with capacity filtering, availability checking, double-booking warnings
- `src/components/lineups/water-lineup-builder.tsx` - Main drag-drop lineup builder with DndContext, roster panel, seat grid, boat selector
- `src/components/lineups/lineup-editor.tsx` - Updated to route WATER blocks to WaterLineupBuilder, maintain LAND/ERG routing
- `src/app/api/lineup-templates/route.ts` - Fixed pre-existing TypeScript error (boatClass query param type)
- `src/app/api/lineup-templates/[id]/route.ts` - Fixed pre-existing TypeScript error (updateData type)

## Decisions Made

**1. Boat capacity calculation excludes cox**
- Rationale: Cox doesn't row, so boat capacity for matching should only count rowing seats
- Implementation: `capacity = seats.filter(s => s.label !== 'Cox').length`

**2. Double-booking warning is non-blocking**
- Rationale: Split squads intentionally use same boat at same time, so hard blocking would prevent valid use case
- Implementation: Show warning with practice name, allow save to proceed

**3. Auto-remove from previous seat on drop**
- Rationale: Prevents duplicate athlete assignments, simplifies coach workflow
- Implementation: Clear athleteId from all seats before assigning to new seat

**4. Partial lineup warning displayed**
- Rationale: Coach awareness when lineup incomplete, but still allow save (work in progress)
- Implementation: Show "(partial lineup)" when assignedAthleteIds.size < seats.length

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type error in lineup-templates route**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** boatClass query parameter was string but needed BoatClass enum type
- **Fix:** Added type cast: `const boatClass = searchParams.get('boatClass') as import('@/generated/prisma').BoatClass | null`
- **Files modified:** src/app/api/lineup-templates/route.ts
- **Verification:** TypeScript compilation passed
- **Committed in:** Type fix was in uncommitted changes, not separately tracked

**2. [Rule 1 - Bug] Fixed TypeScript type error in lineup-templates/[id] route**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** updateData type definition incompatible with Prisma requirements (null vs undefined for defaultBoatId)
- **Fix:** Changed from explicit type to `Record<string, any>` for Prisma compatibility
- **Files modified:** src/app/api/lineup-templates/[id]/route.ts
- **Verification:** TypeScript compilation passed
- **Committed in:** Type fix was in uncommitted changes, not separately tracked

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were for pre-existing TypeScript errors blocking compilation. No scope creep.

## Issues Encountered

**Nested directory artifact**
- Issue: Write tool created `/home/hb/radl/radl/src/...` nested structure
- Resolution: Moved boat-selector.tsx to correct location, removed nested directory
- Impact: One cleanup commit (`cd27558`) to remove artifact

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plan (03-06 land/erg assignment UI, or 03-07 lineup templates):**
- Water lineup builder fully functional with drag-drop
- Boat selector filtering by capacity and availability
- Double-booking warnings implemented
- Lineup editor routing handles both water and land blocks
- LINE-01 and LINE-02 requirements addressed

**No blockers.**

**Considerations for next plans:**
- Land/erg assignment UI uses same athlete roster panel pattern
- Lineup templates will reuse water lineup builder for template creation
- Practice detail pages will need to integrate lineup editor component

---
*Phase: 03-lineup-management*
*Completed: 2026-01-21*
