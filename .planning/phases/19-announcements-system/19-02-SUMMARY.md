---
phase: 19-announcements-system
plan: 02
subsystem: api
tags: [announcements, api, rest, casl, priority-sorting]

# Dependency graph
requires:
  - phase: 19-01-announcements-foundation
    provides: Announcement and AnnouncementRead Prisma models with priority enum, CASL permissions, Zod validation schemas
provides:
  - Complete REST API for announcements (GET list, POST create, PATCH update, DELETE archive, POST read)
  - Priority sorting helper for business-correct announcement ordering (URGENT > WARNING > INFO)
  - Active announcements query builder with practice-linked auto-expiry logic
  - Read receipt tracking with upsert pattern to prevent duplicate key errors
affects: [19-03-announcement-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Priority sorting helper addresses Prisma enum alphabetical sort limitation"
    - "buildActiveAnnouncementsQuery centralizes active announcement filtering logic"
    - "Upsert pattern for read receipts prevents duplicate key errors"
    - "Soft delete via archivedAt instead of hard delete preserves audit trail"

key-files:
  created:
    - src/lib/utils/announcement-helpers.ts
    - src/app/api/announcements/route.ts
    - src/app/api/announcements/[id]/route.ts
    - src/app/api/announcements/[id]/read/route.ts
  modified: []

key-decisions:
  - "Client-side priority sorting required because Prisma sorts enums alphabetically"
  - "Practice-linked announcements auto-expire via practice.endTime filter in query"
  - "Upsert pattern for read receipts makes mark-as-read idempotent"
  - "PATCH endpoint supports partial updates (only provided fields updated)"

patterns-established:
  - "Helper library pattern for query building and sorting logic reuse"
  - "Soft delete via archivedAt for announcement archival preserves history"
  - "Read receipts included in GET with isRead boolean mapped for frontend convenience"

# Metrics
duration: 3min
completed: 2026-01-26
---

# Phase 19 Plan 02: Announcement API Summary

**Complete REST API for announcements with priority sorting, practice-linked auto-expiry, read receipt tracking via upsert, and CASL-enforced coach-only create/update permissions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-26T20:27:25Z
- **Completed:** 2026-01-26T20:30:46Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- GET /api/announcements returns active announcements sorted by priority (URGENT → WARNING → INFO) with per-user read status
- POST /api/announcements creates announcements with CASL coach-only permission check and practice validation
- PATCH /api/announcements/[id] updates announcements with partial update support and practice verification
- DELETE /api/announcements/[id] archives announcements via soft delete (archivedAt timestamp)
- POST /api/announcements/[id]/read marks announcements as read with upsert to prevent duplicate key errors
- Helper library provides priority sorting and active announcements query building with practice auto-expiry logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Create announcement helpers library** - `4c65874` (feat)
2. **Task 2: Create GET/POST /api/announcements endpoints** - `a3cff58` (feat)
3. **Task 3: Create PATCH/DELETE /api/announcements/[id] and POST read endpoints** - `2ce63ca` (feat)

## Files Created/Modified

- `src/lib/utils/announcement-helpers.ts` - Priority sorting helper and active announcements query builder with practice auto-expiry logic
- `src/app/api/announcements/route.ts` - GET list and POST create endpoints with CASL permissions and practice validation
- `src/app/api/announcements/[id]/route.ts` - PATCH update and DELETE archive endpoints with partial update support
- `src/app/api/announcements/[id]/read/route.ts` - POST mark-as-read endpoint with upsert pattern for idempotency

## Decisions Made

**Client-side priority sorting necessary:** Prisma sorts enums alphabetically (INFO, URGENT, WARNING) which doesn't match business priority order (URGENT > WARNING > INFO). Solution: sortAnnouncementsByPriority helper applies correct sort after query.

**Practice-linked auto-expiry via query filter:** Practice-linked announcements auto-expire when practice.endTime < now. Implemented in buildActiveAnnouncementsQuery via OR clause checking practice.endTime for practice-linked announcements and expiresAt for non-practice announcements.

**Upsert pattern for read receipts:** Using Prisma upsert with composite unique key (announcementId_userId) makes mark-as-read idempotent and prevents duplicate key errors if user marks same announcement read multiple times.

**Partial updates with PATCH:** PATCH endpoint only updates fields that are provided in request body, allowing frontend to update single fields (e.g., just title or just priority) without sending full announcement object.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for UI implementation (Plan 03):**
- Complete REST API with all CRUD operations
- Priority sorting helper available for frontend use
- Read receipt tracking with isRead boolean mapped in GET response
- Practice-linked announcements support for practice detail pages
- CASL permissions enforced at API layer for coach-only create/update

**Blockers:** None

**Concerns:** None

---
*Phase: 19-announcements-system*
*Completed: 2026-01-26*
