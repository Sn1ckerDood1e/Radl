---
phase: 22-practice-flow-redesign
plan: 03
subsystem: api
tags: [api, rest, prisma, zod, validation, workouts, lineups, inline-editing]

# Dependency graph
requires:
  - phase: 22-01
    provides: "Workout and WorkoutTemplate models with PM5 constraints"
provides:
  - "Practice and block PATCH endpoints for partial field updates"
  - "Workout CRUD API for ERG/WATER blocks with interval management"
  - "Workout template CRUD API for reusable workout definitions"
  - "Multi-lineup bulk save endpoint for water blocks"
affects: [22-04, 22-05, 22-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upsert pattern for workout updates (delete + create)"
    - "Bulk save endpoint for multiple lineups in single transaction"
    - "Manual partial schema definition for schemas with refinements"

key-files:
  created:
    - src/app/api/practices/[id]/blocks/[blockId]/route.ts
    - src/app/api/practices/[id]/blocks/[blockId]/workout/route.ts
    - src/app/api/practices/[id]/blocks/[blockId]/lineups/route.ts
    - src/app/api/workout-templates/route.ts
    - src/app/api/workout-templates/[id]/route.ts
  modified:
    - src/lib/validations/workout.ts

key-decisions:
  - "PUT uses upsert pattern for workouts: delete existing + create new in transaction"
  - "Multi-lineup endpoint supports create (new-* ids), update (UUID ids), and delete (omitted ids)"
  - "Cannot use .partial() on Zod schemas with .refine() - define partial schemas manually"
  - "Workout endpoints validate block type (ERG or WATER only)"
  - "Lineups endpoint validates block type (WATER only)"

patterns-established:
  - "Partial update pattern: accept optional fields, only update fields present in request"
  - "Transaction pattern for atomic multi-entity updates (workouts with intervals, lineups with seats)"
  - "Team-scoped queries with authorization checks on all endpoints"

# Metrics
duration: 8min
completed: 2026-01-27
---

# Phase 22 Plan 03: Inline Editing API Summary

**REST API endpoints for partial practice/block updates, workout CRUD with PM5 constraints, workout templates, and multi-lineup bulk save**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-27T03:52:18Z
- **Completed:** 2026-01-27T03:00:53Z
- **Tasks:** 4
- **Files modified:** 6

## Accomplishments
- PATCH endpoints enable single-field updates for practices and blocks
- Workout CRUD API supports ERG and WATER blocks with interval management
- Workout template API enables saving and reusing workout definitions
- Multi-lineup bulk save endpoint handles create/update/delete in single transaction
- All endpoints enforce team scoping and CASL authorization

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance practice and block PATCH endpoints** - `2ffb57a` (feat)
2. **Task 2: Create workout CRUD endpoint for blocks** - `4b1ffb6` (feat)
3. **Task 3: Create workout template API** - `f01b09d` (feat)
4. **Task 4: Create multi-lineup bulk save endpoint** - `3666a07` (feat)

**Bug fix:** `509f774` (fix: Prisma relation name and validation schema corrections)

## Files Created/Modified
- `src/app/api/practices/[id]/blocks/[blockId]/route.ts` - Block GET/PATCH/DELETE endpoints
- `src/app/api/practices/[id]/blocks/[blockId]/workout/route.ts` - Workout GET/PUT/DELETE for blocks
- `src/app/api/practices/[id]/blocks/[blockId]/lineups/route.ts` - Multi-lineup GET/PUT bulk save
- `src/app/api/workout-templates/route.ts` - Workout template list and create
- `src/app/api/workout-templates/[id]/route.ts` - Single template GET/PATCH/DELETE
- `src/lib/validations/workout.ts` - Fixed partial schemas (cannot use .partial() with refinements)

## Decisions Made

**PUT upsert pattern for workouts:**
- Workout updates use delete + create in transaction rather than PATCH
- Simpler than updating individual intervals (position reordering complexity)
- Ensures atomic updates of workout + all intervals

**Multi-lineup bulk save endpoint:**
- Single PUT endpoint handles create (new-* ids), update (UUID ids), and delete (omitted ids)
- Max 10 boats per block enforced via validation
- Transaction ensures all-or-nothing consistency

**Zod partial schema limitation:**
- Cannot use .partial() on schemas with .refine() (Zod error at build time)
- Define partial update schemas manually without refinements
- Applied to updateWorkoutSchema and updateWorkoutTemplateSchema

**Block type validation:**
- Workouts only supported on ERG and WATER blocks (not LAND/MEETING)
- Lineups only supported on WATER blocks
- Enforced at API level with 400 error response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma relation name in block GET**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Used `lineups` (plural) but Prisma relation named `lineup` (singular)
- **Fix:** Changed include from `lineups` to `lineup` in block GET endpoint
- **Files modified:** src/app/api/practices/[id]/blocks/[blockId]/route.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 509f774

**2. [Rule 1 - Bug] Fixed Zod partial schemas with refinements**
- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** updateWorkoutSchema and updateWorkoutTemplateSchema used .partial() on schemas with .refine(), causing build error
- **Fix:** Defined partial schemas manually without refinements
- **Files modified:** src/lib/validations/workout.ts
- **Verification:** TypeScript compilation passes, build succeeds
- **Committed in:** 509f774

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both bugs caught at build time, fixed immediately. No scope changes.

## Issues Encountered

None - all planned work completed successfully after bug fixes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for UI layer:**
- All inline editing API endpoints complete and tested via TypeScript compilation
- Practice PATCH supports partial updates for name, date, times, notes, status
- Block PATCH supports partial updates for title, duration, category, notes
- Workout CRUD ready for ERG/WATER block forms
- Workout template API ready for coach template management
- Multi-lineup bulk save ready for water block lineup builders

**What's next:**
- Phase 22-04: Inline editing components (InlineTextField, InlineTextarea, useAutosave)
- Phase 22-05: Block-specific forms (ERG, WATER, LAND, MEETING)
- Phase 22-06: Practice page assembly

**No blockers or concerns.**

---
*Phase: 22-practice-flow-redesign*
*Completed: 2026-01-27*
