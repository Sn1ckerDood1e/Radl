---
phase: 03-lineup-management
plan: 02
subsystem: api
tags: [lineup, api, prisma, rest, validation]

# Dependency graph
requires:
  - phase: 03-01
    provides: Lineup data models, validation schemas, position constants
  - phase: 02-02
    provides: Practice and block data models
provides:
  - Complete lineup CRUD API endpoints
  - Block-specific lineup management endpoints
  - Land/erg assignment endpoints
  - Team-scoped lineup operations with role guards
affects: [03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Block-specific nested routes for context-aware endpoints
    - Replace-all pattern for lineup/assignment PUT operations
    - Athlete validation via team membership joins

key-files:
  created:
    - src/app/api/lineups/route.ts
    - src/app/api/lineups/[id]/route.ts
    - src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts
    - src/app/api/practices/[id]/blocks/[blockId]/assignments/route.ts
  modified: []

key-decisions:
  - "Block-specific endpoints use PUT with replace-all pattern for simpler client integration"
  - "Separate endpoints for water lineups vs land/erg assignments reflect different data models"
  - "Athlete validation checks team membership via join to prevent cross-team data access"

patterns-established:
  - "Block-specific lineup endpoint: PUT replaces entire lineup atomically"
  - "Land assignment endpoint: PUT accepts athleteIds array, replaces all assignments"
  - "Validation includes duplicate position and athlete checks via Zod refinements"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 03 Plan 02: Lineup CRUD API Summary

**Complete REST API for lineup management with water block seat assignments and land/erg group assignments**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T17:56:19Z
- **Completed:** 2026-01-21T18:00:47Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Full CRUD API for lineups with nested seat assignments
- Block-specific endpoints for intuitive practice context
- Separate land/erg assignment API for group-based scheduling
- Team isolation and coach-only guards on all write operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lineup CRUD API endpoints** - `62c1c9c` (feat)
2. **Task 2: Create block-specific lineup endpoint** - `fe341bd` (feat)
3. **Task 3: Create land assignment API endpoint** - `cbc7c8e` (feat)

## Files Created/Modified
- `src/app/api/lineups/route.ts` - POST create lineup, GET list lineups by practice
- `src/app/api/lineups/[id]/route.ts` - GET/PATCH/DELETE individual lineup operations
- `src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts` - GET/PUT lineup for specific block
- `src/app/api/practices/[id]/blocks/[blockId]/assignments/route.ts` - GET/PUT land/erg assignments

## Decisions Made

**1. Block-specific endpoints with PUT replace-all pattern**
- Rationale: Lineup editor builds complete state locally, simpler to PUT entire lineup than PATCH individual changes
- Pattern: DELETE existing + CREATE new in transaction for atomicity
- Applies to both lineup and assignments endpoints

**2. Separate endpoints for water vs land blocks**
- Rationale: Different data models (Lineup with positions vs LandAssignment simple list)
- `/lineup` endpoint validates WATER type only
- `/assignments` endpoint validates LAND/ERG type only
- Clear API contract prevents misuse

**3. Athlete validation via team membership join**
- Rationale: Direct athleteId checks insufficient for multi-tenant isolation
- Implementation: `athleteProfile.teamMember.teamId` join in WHERE clause
- Prevents cross-team athlete assignment even if athleteId is valid

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 03-03 (Lineup Editor UI):**
- API endpoints fully functional
- Validation prevents duplicate athletes and positions
- Block-specific routes provide clean integration points
- Replace-all pattern matches UI local state management

**Ready for 03-04 (Lineup Templates):**
- Lineup creation logic established and tested
- Seat assignment patterns reusable for templates
- Team scoping validated at API layer

**No blockers.**

---
*Phase: 03-lineup-management*
*Completed: 2026-01-21*
