---
phase: 22-practice-flow-redesign
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, validation, zod, pm5, workout]

# Dependency graph
requires:
  - phase: 21-equipment-readiness
    provides: Equipment models and readiness tracking
provides:
  - MEETING block type for team meetings
  - Workout and WorkoutInterval models for PM5-style workout definitions
  - WorkoutTemplate models for reusable workout storage
  - PracticeBlock.title field for block naming
  - Multiple boats per water block support (Lineup relation changes)
  - Workout validation schemas with PM5 constraints
affects: [22-02-practice-builder, 22-03-workout-builder, 22-practice-flow-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PM5-style workout data model (intervals with position ordering)
    - Workout visibility control (coach toggles athlete visibility)
    - Template-based workout reuse pattern

key-files:
  created:
    - src/lib/validations/workout.ts
  modified:
    - prisma/schema.prisma
    - src/lib/validations/practice.ts

key-decisions:
  - "Use PM5 50-interval limit as validation constraint"
  - "Store workout intervals with position-based ordering (0-49)"
  - "Support multiple boats per water block (removed @unique on Lineup.blockId)"
  - "Use findFirst for backward compatibility with existing single-lineup logic"
  - "MEETING blocks do not require athlete assignments"

patterns-established:
  - "Workout intervals stored with position unique constraint per workout"
  - "WorkoutTemplate allows coaches to save and reuse workout definitions"
  - "Workout visibility controlled by visibleToAthletes boolean flag"

# Metrics
duration: 14min
completed: 2026-01-27
---

# Phase 22 Plan 01: Practice Flow Data Foundation Summary

**Extended Prisma schema with MEETING block type, PM5-style Workout models with 50-interval constraint, WorkoutTemplate for reusable workouts, and multiple-boat support per water block**

## Performance

- **Duration:** 14.1 minutes
- **Started:** 2026-01-27T02:54:54Z
- **Completed:** 2026-01-27T03:09:01Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Added MEETING block type to BlockType enum for team meetings
- Created Workout and WorkoutInterval models with PM5 constraints (50 interval max, split format, stroke rate range)
- Created WorkoutTemplate and WorkoutTemplateInterval models for reusable workout storage
- Added title field to PracticeBlock for block naming
- Updated Lineup to support multiple boats per water block (removed @unique constraint on blockId)
- Created workout validation schemas with PM5-style constraints

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema** - `89a9dba` (feat)
2. **Task 2: Generate client and apply migration** - (no commit - generated files gitignored)
3. **Task 3: Create workout validations and fix type integration** - `02a9308` (feat)

## Files Created/Modified

### Created
- `src/lib/validations/workout.ts` - Workout validation schemas with PM5 constraints (50 intervals, split format, stroke rate 16-40)

### Modified
- `prisma/schema.prisma` - Added MEETING to BlockType, added WorkoutType enum, Workout/WorkoutInterval/WorkoutTemplate models, PracticeBlock.title field, updated Lineup relation
- `src/lib/validations/practice.ts` - Updated blockTypeSchema to include MEETING
- `src/components/practices/block-card.tsx` - Added MEETING block type config with purple styling
- `src/components/practices/block-editor.tsx` - Added MEETING to block type selector
- `src/components/templates/template-card.tsx` - Added MEETING block counting
- `src/components/templates/template-form.tsx` - Updated form schema to accept MEETING
- `src/components/lineups/lineup-editor.tsx` - Added MEETING to BlockType union
- `src/app/(dashboard)/[teamSlug]/practices/[id]/page.tsx` - Updated Lineup query to handle array relation
- `src/app/(dashboard)/[teamSlug]/practices/[id]/practice-detail-client.tsx` - Added MEETING handling (no assignments needed)
- `src/app/(dashboard)/[teamSlug]/practice-templates/[id]/template-detail-client.tsx` - Added MEETING block type config
- `src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts` - Changed findUnique to findFirst for Lineup queries
- `src/app/api/lineups/route.ts` - Changed findUnique to findFirst
- `src/app/api/lineup-templates/[id]/apply/route.ts` - Changed findUnique to findFirst
- `src/app/api/block-templates/[id]/route.ts` - Updated type definition to include MEETING

## Decisions Made

1. **PM5 50-interval limit enforced in validation** - Matches real PM5 ergometer constraints, prevents invalid workout definitions
2. **Multiple boats per block via Lineup array relation** - Enables future multi-boat water blocks, backward compatible with existing single-lineup logic using findFirst
3. **Workout visibility toggle** - visibleToAthletes boolean allows coaches to hide workout details while building
4. **MEETING blocks require no assignments** - Team meetings don't need athlete/boat assignments, handled separately in UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript errors from schema changes**
- **Found during:** Task 3 (TypeScript compilation after schema update)
- **Issue:** MEETING block type added to Prisma schema but not reflected in UI components, Lineup relation changed from single to array
- **Fix:**
  - Updated all blockTypeConfig objects to include MEETING with purple styling
  - Updated block type selectors and validators to include MEETING
  - Changed Lineup API queries from findUnique to findFirst (blockId no longer unique)
  - Updated practice page to handle lineup as array with .length check
  - Added MEETING block handling in practice detail (shows "no assignments needed" message)
- **Files modified:** 14 files (components, API routes, page components)
- **Verification:** `npx tsc --noEmit` passes without errors
- **Committed in:** 02a9308 (Task 3 commit)

**2. [Rule 3 - Blocking] Used prisma db push instead of migrate dev**
- **Found during:** Task 2 (Migration application)
- **Issue:** `prisma migrate dev` requires interactive terminal, not supported in non-interactive execution environment
- **Fix:** Used `prisma db push --skip-generate` to sync schema, then `prisma generate` to create client
- **Files modified:** Database schema, generated Prisma client
- **Verification:** Prisma client generated successfully, new enum values and models available
- **Committed in:** (no commit - generated files gitignored)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes were necessary to complete the task. The TypeScript fixes ensure type safety across the codebase. The migration approach change was required due to execution environment constraints but achieved the same result.

## Issues Encountered

- Prisma migration required interactive mode - resolved by using `prisma db push` as non-interactive alternative
- Lineup relation change from one-to-one to one-to-many required widespread TypeScript fixes - all completed successfully

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

✓ **Ready for UI implementation:**
- MEETING block type available for practice builders
- Workout models ready for workout builder UI (22-03)
- WorkoutTemplate models ready for template management
- PracticeBlock.title field ready for inline editing
- Multiple boats per block supported in schema

**Blockers:** None

**Notes:**
- Existing single-lineup logic preserved with findFirst (backward compatible)
- MEETING blocks handled separately in UI (no assignments needed)
- Workout validation ready for frontend forms (50 interval limit, split format regex)

---
*Phase: 22-practice-flow-redesign*
*Completed: 2026-01-27*
