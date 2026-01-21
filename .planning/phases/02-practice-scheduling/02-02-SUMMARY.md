---
phase: 02-practice-scheduling
plan: 02
subsystem: api
tags: [prisma, nextjs, rest-api, practices, blocks]

# Dependency graph
requires:
  - phase: 02-01
    provides: Practice, PracticeBlock Prisma models and Zod validations
provides:
  - Practice CRUD API (list, create, read, update, delete)
  - Practice publish endpoint for DRAFT to PUBLISHED transition
  - Block management API (add, remove, reorder)
  - Multi-tenant isolation on all practice endpoints
  - Role-based visibility (athletes see only PUBLISHED)
affects: [02-03, 02-04, 02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nested Prisma create for parent with children (practice with blocks)"
    - "Position-based reordering with atomic transactions"
    - "Role-based visibility filtering in GET queries"

key-files:
  created:
    - src/app/api/practices/route.ts
    - src/app/api/practices/[id]/route.ts
    - src/app/api/practices/[id]/publish/route.ts
    - src/app/api/practices/[id]/blocks/route.ts
    - src/app/api/practices/[id]/blocks/reorder/route.ts
  modified: []

key-decisions:
  - "Hard delete for practices (no archiving) - practices are time-bound, archiving adds complexity without benefit"
  - "Block removal recomputes all positions to fill gaps (maintains contiguous 0,1,2...)"
  - "Reorder endpoint requires all blocks included to prevent accidental orphaning"

patterns-established:
  - "Nested create: Use Prisma create with nested blocks.create array for atomic parent+children creation"
  - "Position reorder: Use $transaction to update all positions atomically"
  - "Ownership verification: Always fetch parent with teamId filter before child operations"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 2 Plan 2: Practice CRUD API Summary

**Complete practice management API with block CRUD, publish workflow, and role-based visibility filtering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T13:16:08Z
- **Completed:** 2026-01-21T13:19:34Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- Practice list and create endpoints with season filtering and date range queries
- Single practice CRUD with cascading block deletes
- Publish endpoint to transition DRAFT to PUBLISHED status
- Block add, remove, and reorder endpoints with atomic position updates
- Athletes only see PUBLISHED practices (DRAFT hidden from non-coaches)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create practice list and create API** - `55bace8` (feat)
2. **Task 2: Create single practice operations API** - `e0e19e0` (feat)
3. **Task 3: Create block management API** - `00a47e7` (feat)

## Files Created
- `src/app/api/practices/route.ts` - GET list and POST create with nested blocks
- `src/app/api/practices/[id]/route.ts` - GET single, PATCH update, DELETE practice
- `src/app/api/practices/[id]/publish/route.ts` - POST publish (DRAFT to PUBLISHED)
- `src/app/api/practices/[id]/blocks/route.ts` - POST add block, DELETE remove block
- `src/app/api/practices/[id]/blocks/reorder/route.ts` - POST reorder all blocks

## Decisions Made
- Hard delete for practices rather than archiving - practices are date-specific and don't need historical preservation like seasons
- Block removal triggers position recomputation to maintain contiguous sequence (0,1,2...) without gaps
- Reorder endpoint requires all practice blocks to be included - prevents accidental position conflicts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Practice CRUD API complete and ready for UI integration in 02-06
- Block management endpoints available for drag-and-drop reordering
- Ready for template system (02-05) to use same block structure
- All endpoints enforce team isolation and role-based access

---
*Phase: 02-practice-scheduling*
*Completed: 2026-01-21*
