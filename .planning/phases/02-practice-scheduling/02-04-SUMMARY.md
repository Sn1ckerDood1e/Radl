---
phase: 02-practice-scheduling
plan: 04
subsystem: api
tags: [templates, prisma, crud, date-fns]

# Dependency graph
requires:
  - phase: 02-01
    provides: PracticeTemplate, TemplateBlock, BlockTemplate models
  - phase: 02-02
    provides: Practice CRUD patterns for reference
provides:
  - Practice template CRUD API (GET/POST/PATCH/DELETE)
  - Block template CRUD API (GET/POST/PATCH/DELETE)
  - Template apply endpoint (copy-on-apply pattern)
affects: [02-06-calendar-ui, lineup-ui]

# Tech tracking
tech-stack:
  added: [date-fns]
  patterns: [copy-on-apply, replace-all-blocks]

key-files:
  created:
    - src/app/api/practice-templates/route.ts
    - src/app/api/practice-templates/[id]/route.ts
    - src/app/api/practice-templates/apply/route.ts
    - src/app/api/block-templates/route.ts
    - src/app/api/block-templates/[id]/route.ts

key-decisions:
  - "Copy-on-apply pattern: applying template creates independent practice"
  - "Replace-all pattern for template blocks in PATCH"
  - "date-fns for time manipulation"

patterns-established:
  - "Copy-on-apply: template.apply copies data, no ongoing link"
  - "Replace-all blocks: PATCH with blocks array deletes all and recreates"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 02 Plan 04: Template System API Summary

**Practice and block template CRUD with copy-on-apply pattern using date-fns for time handling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T13:23:14Z
- **Completed:** 2026-01-21T13:26:53Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- Practice template CRUD API with nested blocks
- Block template CRUD API for reusable standalone blocks
- Apply template endpoint that creates independent practice copies
- Time handling with date-fns for combining template times with practice dates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create practice template CRUD API** - `b652be0` (feat)
2. **Task 2: Create template apply endpoint** - `cada5b3` (feat)
3. **Task 3: Create block template CRUD API** - `1ce55ec` (feat)

## Files Created
- `src/app/api/practice-templates/route.ts` - GET list and POST create for practice templates
- `src/app/api/practice-templates/[id]/route.ts` - GET/PATCH/DELETE for single practice template
- `src/app/api/practice-templates/apply/route.ts` - POST to create practice from template
- `src/app/api/block-templates/route.ts` - GET list and POST create for block templates
- `src/app/api/block-templates/[id]/route.ts` - GET/PATCH/DELETE for single block template

## Decisions Made
- **Copy-on-apply pattern:** When applying a template to create a practice, the data is copied completely. There is no ongoing link between the template and the created practice. Editing the template later does NOT affect existing practices.
- **Replace-all pattern for blocks:** When PATCHing a practice template with a blocks array, all existing blocks are deleted and recreated from the new array. This prevents position conflicts and simplifies the API.
- **date-fns added:** Used `set()` from date-fns to combine the practice date with template's default start/end times (HH:MM format).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing date-fns dependency**
- **Found during:** Task 2 (Template apply endpoint)
- **Issue:** date-fns package not in package.json, import failing
- **Fix:** Ran `npm install date-fns`
- **Files modified:** package.json, package-lock.json
- **Verification:** Import succeeds, tsc passes
- **Committed in:** cada5b3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required dependency for time manipulation. No scope creep.

## Issues Encountered
None - all endpoints implemented following established patterns.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Template system complete, ready for calendar UI (02-06)
- Coaches can save practice structures and quickly create new practices
- Block templates available for quick insertion during manual practice building

---
*Phase: 02-practice-scheduling*
*Completed: 2026-01-21*
