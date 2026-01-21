---
phase: 03-lineup-management
plan: 07
subsystem: api, ui
tags: [lineup, template, reusable, prisma, react]

# Dependency graph
requires:
  - phase: 03-02
    provides: Lineup CRUD API patterns
provides:
  - Lineup template CRUD API endpoints
  - Template apply endpoint with graceful degradation
  - UI components for save/apply template workflow
affects: [03-lineup-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Copy-on-apply pattern for lineup templates"
    - "Graceful degradation with warnings array"
    - "Template filtering by boat class"

key-files:
  created:
    - src/app/api/lineup-templates/route.ts
    - src/app/api/lineup-templates/[id]/route.ts
    - src/app/api/lineup-templates/[id]/apply/route.ts
    - src/components/lineups/lineup-template-picker.tsx
    - src/components/lineups/save-as-template-button.tsx
  modified: []

key-decisions:
  - "Copy-on-apply pattern: Templates create independent lineups with no ongoing link"
  - "Graceful degradation: Missing athletes skipped, unavailable boats not assigned"
  - "Warnings array: Apply endpoint returns warnings without failing operation"

patterns-established:
  - "Template apply with graceful degradation: Skip missing athletes, warn about unavailable boats"
  - "Copy-on-apply for templates: No ongoing link between template and lineup"
  - "Template picker follows practice template UI patterns"

# Metrics
duration: 9min
completed: 2026-01-21
---

# Phase 3 Plan 7: Lineup Template System Summary

**Lineup template CRUD API with copy-on-apply pattern and graceful degradation for missing athletes and unavailable boats**

## Performance

- **Duration:** 9 min
- **Started:** 2026-01-21T18:11:27Z
- **Completed:** 2026-01-21T18:20:42Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- Complete CRUD API for lineup templates with boat class filtering
- Template apply endpoint with copy-on-apply pattern
- Graceful degradation handling for missing athletes and unavailable boats
- UI components for saving and applying lineup templates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lineup template CRUD API** - `8c2423f` (feat)
2. **Task 2: Create template apply endpoint** - `bebd24f` (feat)
3. **Task 3: Create template picker and save button components** - `91c9a17` (feat)

## Files Created/Modified

**Created:**
- `src/app/api/lineup-templates/route.ts` - Template CRUD: GET list (with boatClass filter), POST create
- `src/app/api/lineup-templates/[id]/route.ts` - Template CRUD: GET single, PATCH update, DELETE
- `src/app/api/lineup-templates/[id]/apply/route.ts` - Apply template to block with graceful degradation
- `src/components/lineups/lineup-template-picker.tsx` - Template selection and apply UI with warnings display
- `src/components/lineups/save-as-template-button.tsx` - Save current lineup as template modal

## Decisions Made

**1. Copy-on-apply pattern**
- Templates create independent lineups with no ongoing link
- Follows practice template pattern from Phase 2
- Enables template evolution without affecting existing lineups

**2. Graceful degradation for apply operation**
- Missing athletes: Skipped from lineup, warning added
- Unavailable boats: Not assigned, warning added
- Boat class mismatch: Not assigned, warning added
- Operation succeeds with partial data rather than failing

**3. Warnings array return format**
- Apply endpoint returns `{ lineup, warnings }` structure
- Warnings include type, message, and optional position/athleteId
- UI displays warnings to coach after successful apply

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Lineup template system complete:**
- Coaches can save lineups as reusable templates
- Templates filter by boat class for easy selection
- Apply creates new lineup with copy-on-apply pattern
- Graceful degradation handles team roster changes

**Ready for:**
- Integration into lineup editor UI
- Template management pages
- LINE-03 requirement verification

**LINE-03 Complete:**
- ✅ Coaches can save lineup as template
- ✅ Templates store default athletes and boat class
- ✅ Apply template copies data (no ongoing link)
- ✅ Missing athletes handled gracefully (skipped)
- ✅ Unavailable boats handled gracefully (not assigned)

---
*Phase: 03-lineup-management*
*Completed: 2026-01-21*
