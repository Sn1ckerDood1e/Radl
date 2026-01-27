---
phase: 22-practice-flow-redesign
plan: 05
subsystem: ui
tags: [react-hook-form, workout-builder, pm5, intervals, form-validation]

# Dependency graph
requires:
  - phase: 22-01
    provides: "Workout validation schemas with PM5 constraints"
  - phase: 22-03
    provides: "Workout and workout template API endpoints"
provides:
  - "WorkoutBuilder component with PM5-style interval builder"
  - "WorkoutIntervalRow component for individual interval editing"
  - "WorkoutTemplatePicker component for applying saved templates"
  - "React Hook Form integration with useFieldArray pattern"
affects: [22-06, 22-07, practice-block-editors]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useFieldArray for dynamic interval list management"
    - "PM5-style workout builder with interval-by-interval entry"
    - "Context-aware target fields (split for erg, stroke rate for water)"
    - "Template save/apply pattern with dialog UI"

key-files:
  created:
    - src/components/practices/workout-builder.tsx
    - src/components/practices/workout-interval-row.tsx
    - src/components/practices/workout-template-picker.tsx
  modified: []

key-decisions:
  - "useFieldArray for dynamic interval management follows react-hook-form best practices"
  - "PM5 warning threshold at 45 intervals (90% of 50 limit) gives advance notice"
  - "Visibility toggle prominently placed per CONTEXT.md coach control requirement"
  - "Template dialog uses simple input + buttons pattern (no shadcn Dialog) for lightweight implementation"
  - "Type assertion used for zodResolver/useForm compatibility with schemas containing .default()"

patterns-established:
  - "PM5-style workout builder: add intervals one-by-one, not bulk grid entry"
  - "Context-aware form fields: components adapt based on block type (erg vs water)"
  - "Template picker lazy loads on open to avoid unnecessary API calls"
  - "Workout builder accepts existing workout or starts with sensible default (5min interval)"

# Metrics
duration: 0m 13s
completed: 2026-01-27
---

# Phase 22 Plan 05: Workout Builder Components Summary

**PM5-style workout builder with interval-by-interval entry, workout type selection, athlete visibility toggle, and template save/apply functionality**

## Performance

- **Duration:** 0m 13s (extremely fast due to code generation)
- **Started:** 2026-01-27T03:28:39Z
- **Completed:** 2026-01-27T03:28:52Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments

- PM5-style workout builder with add intervals one-by-one pattern
- Full PM5 workout types: single time, single distance, intervals, variable intervals
- Interval count indicator with warning at 45+ (PM5 limit is 50)
- Coach can toggle athlete visibility per CONTEXT.md
- Workout templates can be saved and applied
- Context-aware target fields (split for erg, stroke rate for water)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WorkoutIntervalRow component** - `99df7de` (feat)
2. **Task 2: Create WorkoutBuilder component** - `3e0e896` (feat)
3. **Task 3: Create WorkoutTemplatePicker component** - `9703949` (feat)

## Files Created/Modified

- `src/components/practices/workout-interval-row.tsx` - Single interval row with time/distance, target, rest fields
- `src/components/practices/workout-builder.tsx` - Main workout builder with useFieldArray, type selector, visibility toggle
- `src/components/practices/workout-template-picker.tsx` - Lazy-loading dropdown for applying saved workout templates

## Decisions Made

**useFieldArray pattern for dynamic intervals**
- React Hook Form's useFieldArray provides clean API for adding/removing intervals
- Each interval gets stable field.id for React key management
- Follows react-hook-form best practices for dynamic form arrays

**PM5 warning threshold at 45 intervals**
- Gives coaches advance notice at 90% of 50-interval PM5 limit
- Amber color (not red) since it's warning, not error
- Prevents surprise "can't add more intervals" at exactly 50

**Visibility toggle prominently placed**
- Per CONTEXT.md: "Coach controls visibility — can toggle whether athletes see workout details"
- Placed in header row next to workout type for easy access
- Visual distinction: emerald green when visible, gray when hidden
- Eye/EyeOff icon reinforces state clearly

**Template dialog uses simple pattern**
- Lightweight input + buttons in fixed overlay
- No shadcn Dialog component needed for this simple case
- Autofocus on input for immediate typing
- Enter key could be added for quick save (future enhancement)

**Type assertion for zodResolver compatibility**
- Zod schemas with `.default()` create type inference mismatch
- Zod makes fields with defaults optional in input type, required in output
- React Hook Form expects consistent types throughout
- Type assertion `as ReturnType<typeof useForm<CreateWorkoutInput>>` resolves conflict
- Zod still validates and applies defaults at runtime correctly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript type inference with Zod defaults**
- Issue: Zod schemas with `.default()` create optional fields in input type but required in output
- React Hook Form zodResolver expected consistent types throughout
- Solution: Type assertion on useForm return value to force CreateWorkoutInput type
- Impact: Type safety maintained, Zod still validates and applies defaults correctly at runtime

## Next Phase Readiness

**Ready for integration:**
- WorkoutBuilder can be integrated into ERG and WATER block editors
- WorkoutIntervalRow handles both erg (split) and water (stroke rate) contexts
- WorkoutTemplatePicker connects to /api/workout-templates endpoint
- All components use validation schemas from 22-01

**Block editor integration (likely Plan 06-07):**
- Pass blockType prop ('ERG' or 'WATER') to WorkoutBuilder
- Wire onSave to PUT /api/practices/[id]/blocks/[blockId]/workout
- Wire onDelete to DELETE /api/practices/[id]/blocks/[blockId]/workout
- Wire onSaveAsTemplate to POST /api/workout-templates
- WorkoutTemplatePicker onSelect should populate WorkoutBuilder form

**Future enhancements:**
- Template preview on hover in WorkoutTemplatePicker
- Keyboard shortcuts (Enter to save template name)
- Drag-to-reorder intervals (currently position-based via array index)
- Copy interval button for quick duplication

---
*Phase: 22-practice-flow-redesign*
*Completed: 2026-01-27*
