---
phase: 02-practice-scheduling
plan: 01
subsystem: database
tags: [prisma, postgresql, zod, validation, models]

# Dependency graph
requires:
  - phase: 01-security-foundation
    provides: Season model, Team model, auth patterns
provides:
  - Practice model for scheduled training sessions
  - PracticeBlock model with position-based ordering
  - PracticeTemplate and TemplateBlock for reusable structures
  - BlockTemplate for standalone reusable blocks
  - Regatta placeholder model for Phase 5
  - Equipment manual unavailability fields
  - Zod validation schemas for practice and template APIs
affects: [02-practice-scheduling, 03-lineup-management, 05-regatta-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Position-based block ordering (position Int for sequencing)
    - Time-only strings for templates (HH:MM format)
    - Full datetime for practice instances

key-files:
  created:
    - prisma/schema.prisma
    - src/lib/validations/practice.ts
    - src/lib/validations/template.ts
  modified: []

key-decisions:
  - "Practice uses full DateTime for startTime/endTime, templates use HH:MM strings"
  - "Blocks ordered by position Int, not time-slotted"
  - "PracticeStatus DRAFT/PUBLISHED controls visibility (DRAFT = coach only)"

patterns-established:
  - "Position-based ordering: position Int field with [parentId, position] index"
  - "Template pattern: template models mirror instance models with default values"
  - "Block types: WATER/LAND/ERG enum covers all practice activities"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 2 Plan 01: Data Models Summary

**Prisma schema with Practice, PracticeBlock, PracticeTemplate, BlockTemplate, and Regatta models plus Zod validation schemas**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T12:55:58Z
- **Completed:** 2026-01-21T12:59:24Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- Practice model with team, season, date, time, status fields
- PracticeBlock model with position-based ordering for practice segments
- PracticeTemplate and TemplateBlock models for reusable practice structures
- BlockTemplate for standalone reusable blocks
- Regatta placeholder model ready for Phase 5
- Equipment extended with manualUnavailable fields for scheduling
- Zod schemas with time validation refinements

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Practice and Block models to Prisma schema** - `9340bbd` (feat)
2. **Task 2: Create Zod validation schemas** - `e0c936f` (feat)
3. **Task 3: Generate Prisma client and verify schema** - No commit (prisma generate produces gitignored files)

## Files Created/Modified

- `prisma/schema.prisma` - Practice, PracticeBlock, PracticeTemplate, TemplateBlock, BlockTemplate, Regatta models; Equipment extensions
- `src/lib/validations/practice.ts` - createPracticeSchema, updatePracticeSchema, block schemas with type exports
- `src/lib/validations/template.ts` - createPracticeTemplateSchema, createBlockTemplateSchema with HH:MM time validation

## Decisions Made

1. **DateTime vs String for times:** Practice instances use full DateTime for startTime/endTime (needed for calendar display), while templates use HH:MM strings (time-of-day only, date applied when creating from template)

2. **Position-based ordering:** Blocks use `position Int` field rather than time slots. This allows flexible ordering without requiring duration math. Index on [practiceId, position] ensures efficient ordering queries.

3. **DRAFT/PUBLISHED status:** PracticeStatus enum controls visibility. DRAFT practices only visible to coaches, PUBLISHED visible to all team members. Default to DRAFT so coaches can prepare before publishing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all verification steps passed on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Database schema applied and ready for API development
- Prisma client regenerated with all new types available
- Validation schemas ready for use in API routes
- Next plan (02-02) can build Practice CRUD API using these models

---
*Phase: 02-practice-scheduling*
*Completed: 2026-01-21*
