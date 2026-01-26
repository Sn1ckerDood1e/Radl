---
phase: 19-announcements-system
plan: 01
subsystem: database
tags: [prisma, casl, zod, announcements, rbac]

# Dependency graph
requires:
  - phase: 10-security-foundation
    provides: CASL permissions infrastructure with role-based access control
provides:
  - Announcement and AnnouncementRead Prisma models with priority enum
  - CASL permissions for announcement management (coach manage, all read)
  - Zod validation schemas for announcement CRUD operations
affects: [19-02-announcement-api, 19-03-announcement-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-user read tracking with unique constraint pattern (announcementId, userId)"
    - "Priority enum for announcement urgency levels (INFO, WARNING, URGENT)"
    - "Soft delete via archivedAt timestamp instead of hard delete"

key-files:
  created:
    - src/lib/validations/announcement.ts
  modified:
    - prisma/schema.prisma
    - src/lib/permissions/subjects.ts
    - src/lib/permissions/ability.ts

key-decisions:
  - "Announcement priority enum ordered INFO → WARNING → URGENT for display sorting"
  - "AnnouncementRead uses unique constraint to prevent duplicate read receipts"
  - "Practice link optional with SetNull on delete to preserve announcement history"
  - "Expiry validation enforces future dates only at validation layer, not database"

patterns-established:
  - "Team-scoped announcements with optional practice linking pattern"
  - "Read receipt tracking with composite unique index for deduplication"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 19 Plan 01: Announcements Foundation Summary

**Announcement and AnnouncementRead models with priority enum, CASL permissions for coach manage + athlete read, Zod schemas enforcing title/body limits and future expiry dates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T20:20:51Z
- **Completed:** 2026-01-26T20:24:49Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Prisma schema includes Announcement model with priority levels, optional practice linking, and expiry dates
- AnnouncementRead model tracks per-user read state with unique constraint preventing duplicates
- CASL recognizes Announcement subject with coach manage permissions, all roles read permissions
- Zod validation enforces 100-char title limit, 1000-char body limit, and expiry-must-be-future rule

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Announcement and AnnouncementRead models to Prisma schema** - `69b5828` (feat)
2. **Task 2: Add Announcement subject to CASL permissions** - `6780b23` (feat)
3. **Task 3: Create Zod validation schemas for announcements** - `806f6b9` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added AnnouncementPriority enum, Announcement and AnnouncementRead models with relations
- `src/lib/permissions/subjects.ts` - Added Announcement type to AppSubjects and SUBJECTS array
- `src/lib/permissions/ability.ts` - Added Announcement permissions for all roles (coach manage, others read)
- `src/lib/validations/announcement.ts` - Created Zod schemas for create/update/markAsRead with type exports

## Decisions Made

- **AnnouncementPriority enum order:** INFO, WARNING, URGENT - matches natural display sort order (low → high urgency)
- **Unique constraint pattern:** `@@unique([announcementId, userId])` prevents duplicate read receipts efficiently
- **Practice link cascade:** `onDelete: SetNull` preserves announcement when practice deleted (history retention)
- **Expiry validation location:** Enforced in Zod schema (application layer) not database constraint for flexibility
- **Soft delete approach:** `archivedAt` timestamp instead of hard delete enables audit trail and recovery
- **Index strategy:** Composite index on `[teamId, priority, createdAt]` optimizes dashboard sorted query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for API implementation (Plan 02):**
- Database models exist with proper relations and indexes
- CASL permissions configured for all roles
- Validation schemas ready for API endpoint integration
- Type exports available for TypeScript safety

**Blockers:** None

**Concerns:** None

---
*Phase: 19-announcements-system*
*Completed: 2026-01-26*
