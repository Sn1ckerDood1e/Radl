---
phase: 11-mfa-sso
plan: 05
subsystem: api
tags: [permission-grants, cron, audit, rbac, temporary-access]

# Dependency graph
requires:
  - phase: 11-01
    provides: PermissionGrant model in Prisma schema
  - phase: 11-04
    provides: Grant helper functions (createGrant, revokeGrant, getClubGrants, etc.)
provides:
  - Permission grants API endpoints (GET, POST, DELETE)
  - Grant expiration cron job
  - Permission grant audit actions
affects: [11-06-casl-integration, admin-ui, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cron job pattern with CRON_SECRET authentication
    - Permission grant audit logging

key-files:
  created:
    - src/app/api/permission-grants/route.ts
    - src/app/api/permission-grants/[id]/route.ts
    - src/app/api/cron/expire-grants/route.ts
    - vercel.json
  modified:
    - src/lib/audit/actions.ts

key-decisions:
  - "Cron runs every 4 hours (0 */4 * * *) for timely expiration processing"
  - "24-hour warning window for expiring grants"
  - "System user ID 'system' for cron-triggered audit logs"

patterns-established:
  - "Permission grant API pattern: admin-only, club-scoped, audit logged"
  - "Cron job pattern: CRON_SECRET auth, structured JSON response"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 11 Plan 05: Permission Grants API Summary

**Permission grants CRUD API with admin authorization, audit logging, and scheduled expiration cron job running every 4 hours**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T14:52:18Z
- **Completed:** 2026-01-23T14:55:42Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Complete permission grants API with GET/POST/DELETE endpoints
- Admin-only authorization (FACILITY_ADMIN or CLUB_ADMIN required)
- Grant expiration cron job with 24-hour warning notifications
- Full audit logging for create, revoke, and expire events
- Vercel cron configuration for both audit-cleanup and expire-grants

## Task Commits

Each task was committed atomically:

1. **Task 1: Add permission grant audit actions** - `afbe8cf` (feat)
2. **Task 2: Create permission grants API endpoints** - `70f9e36` (feat)
3. **Task 3: Create grant expiration cron job** - `8b9c1c9` (feat)

## Files Created/Modified
- `src/lib/audit/actions.ts` - Added PERMISSION_GRANT_CREATED/REVOKED/EXPIRED audit actions
- `src/app/api/permission-grants/route.ts` - GET (list grants) and POST (create grant) endpoints
- `src/app/api/permission-grants/[id]/route.ts` - DELETE (revoke grant) endpoint
- `src/app/api/cron/expire-grants/route.ts` - Cron job for expiration processing
- `vercel.json` - Cron configuration for audit-cleanup and expire-grants

## Decisions Made
- Used 'system' as userId for cron-triggered audit logs to distinguish automated vs manual actions
- 24-hour expiration warning window aligns with cron frequency (every 4 hours)
- revokeGrant function only takes grantId; revokedBy captured in audit metadata instead

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed logAuditEvent function signature**
- **Found during:** Task 3 (Cron job implementation)
- **Issue:** Plan showed logAuditEvent with single combined object, but actual signature is (context, entry)
- **Fix:** Split parameters into context and entry objects per actual function signature
- **Files modified:** src/app/api/cron/expire-grants/route.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 8b9c1c9 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor signature correction. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Permission grants API complete, ready for admin UI integration
- Grant expiration cron job scheduled in vercel.json
- CASL ability integration (11-06) can now incorporate temporary grants
- Notifications TODO markers in place for future notification plan

---
*Phase: 11-mfa-sso*
*Completed: 2026-01-23*
