---
phase: 03-lineup-management
plan: 01
subsystem: database
tags: [prisma, zod, rowing, lineups, data-models]

# Dependency graph
requires:
  - phase: 02-practice-scheduling
    provides: PracticeBlock model for lineup association
provides:
  - Lineup and SeatAssignment models for water blocks
  - LineupTemplate and TemplateSeat models for reusable configurations
  - EquipmentUsageLog model for boat tracking
  - LandAssignment model for erg/land blocks
  - Rowing position constants and validation schemas
affects: [03-02-lineup-api, 03-03-lineup-ui, 03-04-template-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SeatSide enum for port/starboard/none distinction"
    - "Position-based seat numbering (1=Bow, 8=Stroke, 9=Cox)"
    - "Unique constraints prevent duplicate positions and duplicate athletes in lineups"

key-files:
  created:
    - src/lib/lineup/position-labels.ts
    - src/lib/validations/lineup.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "One lineup per block via @unique constraint on blockId"
  - "Boat assignment optional (nullable boatId) until coach assigns"
  - "Standard rowing positions defined with proper port/starboard alternation"
  - "Separate LandAssignment model for erg/land blocks (group-based, no positions)"
  - "EquipmentUsageLog with denormalized teamId for efficient queries"

patterns-established:
  - "SeatSide enum: PORT/STARBOARD for sweep, NONE for sculls and coxswain"
  - "Position numbering: 1-based (1=Bow, middle seats numbered, stroke=highest rowing seat, cox=one above)"
  - "Validation refinements: Duplicate athlete/position checks at schema level"
  - "ROWING_POSITIONS constant: Standard configurations for all boat classes"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 3 Plan 01: Lineup Data Foundation Summary

**Prisma models for lineups with seat assignments, rowing position constants (Bow to Stroke), and validation schemas with duplicate prevention**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T17:48:41Z
- **Completed:** 2026-01-21T17:51:44Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created comprehensive data models for lineup management (6 new models)
- Defined standard rowing positions for all boat classes with proper port/starboard alternation
- Implemented validation schemas with duplicate athlete/position detection
- Applied schema to database with Prisma client regeneration

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Lineup and SeatAssignment models to Prisma schema** - `ed5208c` (feat)
2. **Task 2: Create Zod validation schemas and rowing position constants** - `42dcf58` (feat)
3. **Task 3: Generate Prisma client and verify schema** - (no commit - db push/generate operation)

## Files Created/Modified
- `prisma/schema.prisma` - Added 6 new models: Lineup, SeatAssignment, LineupTemplate, TemplateSeat, EquipmentUsageLog, LandAssignment; added SeatSide enum; updated relations on Team, Equipment, AthleteProfile, Practice, PracticeBlock
- `src/lib/lineup/position-labels.ts` - Rowing position constants (ROWING_POSITIONS, POSITION_LABELS) and helper functions (getSeatsForBoatClass, getCapacityForBoatClass, isScullBoat)
- `src/lib/validations/lineup.ts` - Zod schemas for lineup validation (createLineupSchema, updateLineupSchema, createLineupTemplateSchema, createLandAssignmentSchema) with refinements for duplicate detection

## Decisions Made

**One lineup per block (unique constraint)**
- Rationale: Each practice block has at most one water lineup or one land assignment group
- Implementation: `blockId String @unique` on Lineup model
- Alternative considered: Many lineups per block (rejected - adds complexity without clear use case)

**Optional boat assignment**
- Rationale: Coaches build lineups first, assign boats later based on availability
- Implementation: `boatId String?` nullable field
- Supports workflow: Create lineup → check equipment availability → assign boat

**Standard rowing positions with port/starboard**
- Rationale: Proper rowing terminology essential for coach usability
- Implementation: ROWING_POSITIONS constant with seat configurations for all BoatClass values
- Pattern: Bow side alternates (Port/Starboard/Port/Starboard for sweep boats), sculls are NONE

**Separate land assignment model**
- Rationale: Land/erg blocks don't have positions or sides, just a group of athletes
- Implementation: LandAssignment model with simple blockId + athleteId relation
- Prevents confusion: Lineup is for water with positions, LandAssignment is for land without positions

**Equipment usage logging with denormalized teamId**
- Rationale: Query performance for team-scoped equipment reports
- Implementation: teamId String field duplicated from equipment.teamId
- Trade-off: Slight redundancy for significant query speed improvement

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - schema validation, TypeScript compilation, and database migration all succeeded without issues.

## Next Phase Readiness

**Ready for Phase 3 Plan 02 (Lineup API):**
- All data models defined and migrated to database
- Validation schemas ready for API route input validation
- Position constants available for API responses and UI rendering
- Type exports available for TypeScript type safety

**No blockers.**

**Considerations for next plans:**
- API will need to handle seat assignment creation/update/delete within lineup operations
- Template application will copy TemplateSeat positions to SeatAssignment
- Equipment availability checks should consider EquipmentUsageLog when scheduling

---
*Phase: 03-lineup-management*
*Completed: 2026-01-21*
