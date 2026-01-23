---
phase: 11-mfa-sso
plan: 04
subsystem: auth
tags: [permission-grant, rbac, temporary-access, casl]

# Dependency graph
requires:
  - phase: 10
    provides: ClubMembership model, RBAC foundation
  - phase: 11-01
    provides: PermissionGrant database model
provides:
  - createGrant function for time-bounded role elevation
  - revokeGrant function for early termination
  - getActiveGrants for user's active grants
  - getUserEffectiveRoles for CASL ability integration
  - Expiration helpers for cron job processing
affects: [11-05, 11-06, ability-integration, grant-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft-revoke pattern (revokedAt timestamp vs delete)"
    - "Duration preset pattern for UX consistency"

key-files:
  created:
    - src/lib/auth/permission-grant.ts
    - src/lib/validations/permission-grant.ts
  modified:
    - src/app/(dashboard)/[teamSlug]/invitations/invitations-client.tsx
    - src/app/(dashboard)/[teamSlug]/roster/roster-client.tsx
    - src/app/(dashboard)/[teamSlug]/roster/[id]/profile-client.tsx
    - src/components/athletes/athlete-card.tsx

key-decisions:
  - "Removed revokedBy parameter (unused, can add for audit later)"
  - "Duration presets: 1 day, 3 days, 1 week, 2 weeks, 1 month"
  - "Only CLUB_ADMIN and COACH roles are grantable"

patterns-established:
  - "Duration preset pattern: object with label and hours"
  - "Soft-revoke pattern: revokedAt timestamp for expiration tracking"
  - "Effective roles pattern: merge base roles with granted roles"

# Metrics
duration: 8min
completed: 2026-01-23
---

# Phase 11 Plan 04: Permission Grant Helpers Summary

**Time-bounded permission grant system with preset durations, soft-revocation, and CASL-ready getUserEffectiveRoles for temporary role elevation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T14:41:09Z
- **Completed:** 2026-01-23T14:49:00Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 bug fixes)

## Accomplishments
- Permission grant validation schemas with 5 preset durations
- Full grant lifecycle management (create, revoke, query, expire)
- getUserEffectiveRoles function ready for CASL ability integration
- Expiration helpers for notification and cleanup cron jobs
- Fixed pre-existing Role type mismatches from Phase 10 RBAC changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create permission grant validation schemas** - `5063052` (feat)
2. **Bug fix: Role type mismatches** - `d31bd00` (fix)
3. **Task 2: Create permission grant helper functions** - `92484d5` (feat)

## Files Created/Modified
- `src/lib/validations/permission-grant.ts` - Zod schemas and duration presets
- `src/lib/auth/permission-grant.ts` - Grant lifecycle helper functions
- `src/app/(dashboard)/[teamSlug]/invitations/invitations-client.tsx` - Fixed Role type
- `src/app/(dashboard)/[teamSlug]/roster/roster-client.tsx` - Fixed Role type
- `src/app/(dashboard)/[teamSlug]/roster/[id]/profile-client.tsx` - Fixed Role type and badge styles
- `src/components/athletes/athlete-card.tsx` - Fixed Role type and badge styles

## Decisions Made
- Removed `revokedBy` parameter from `revokeGrant` - not currently used, can be added when audit logging is integrated
- Duration presets are fixed choices (1 day to 1 month) rather than arbitrary dates for UX consistency
- Only CLUB_ADMIN and COACH roles can be granted temporarily (not FACILITY_ADMIN, ATHLETE, or PARENT)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Role type mismatches in UI components**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** Multiple UI components had hard-coded Role types missing FACILITY_ADMIN and CLUB_ADMIN from Phase 10 RBAC changes
- **Fix:** Updated Role type unions in 4 files, added role badge styles for new admin roles
- **Files modified:** invitations-client.tsx, roster-client.tsx, profile-client.tsx, athlete-card.tsx
- **Verification:** Build passes
- **Committed in:** d31bd00

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Pre-existing type mismatch from Phase 10 required fixing for build to pass. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Permission grant helpers ready for API endpoint integration (11-05)
- getUserEffectiveRoles ready for ability.ts integration
- Expiration helpers ready for cron job implementation

---
*Phase: 11-mfa-sso*
*Completed: 2026-01-23*
