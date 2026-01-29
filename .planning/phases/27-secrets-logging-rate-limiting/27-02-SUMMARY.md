---
phase: 27-secrets-logging-rate-limiting
plan: 02
subsystem: security
tags: [audit, logging, rls, postgres, immutability]

# Dependency graph
requires:
  - phase: 26-rbac-tenant-isolation
    provides: RLS helper functions (get_current_club_id, is_club_admin_or_higher, is_facility_admin)
provides:
  - Auth event types (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_RESET, SIGNUP)
  - PERMISSION_DENIED event type for 403 responses
  - AuditLog immutability enforcement via RLS + trigger
  - forbiddenResponse with optional audit logging
affects: [27-03-auth-logging, 27-04-rate-limiting, 28-security-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget audit logging in error responses"
    - "Defense-in-depth immutability (RLS + trigger)"
    - "Backward-compatible function signature extension"

key-files:
  created:
    - supabase/migrations/00009_audit_log_immutability.sql
  modified:
    - src/lib/audit/actions.ts
    - src/lib/errors/index.ts

key-decisions:
  - "Fire-and-forget pattern for forbiddenResponse logging (performance over guaranteed logging)"
  - "Defense-in-depth immutability: both RLS and trigger to catch service role modifications"
  - "Backward compatibility for forbiddenResponse (all params optional)"

patterns-established:
  - "Pattern 1: Audit logging in error handlers is optional and fire-and-forget"
  - "Pattern 2: AuditLog uses both RLS (blocks authenticated) and trigger (blocks service role)"

# Metrics
duration: 3min
completed: 2026-01-29
---

# Phase 27 Plan 02: Audit Infrastructure Extension Summary

**Extended audit logging with auth/permission events, RLS immutability, and fire-and-forget PERMISSION_DENIED tracking in 403 responses**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-29T14:35:06Z
- **Completed:** 2026-01-29T14:37:58Z
- **Tasks:** 3
- **Files modified:** 2 files modified, 1 file created

## Accomplishments

- Added 8 new audit action types (7 auth events + PERMISSION_DENIED)
- Created AuditLog immutability migration with RLS + trigger defense-in-depth
- Extended forbiddenResponse to optionally log PERMISSION_DENIED events
- Maintained backward compatibility for existing forbiddenResponse callers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auth event types to audit actions** - `8d2e6d4` (feat)
2. **Task 2: Create AuditLog immutability migration** - `40ec2d0` (feat)
3. **Task 3: Add PERMISSION_DENIED logging to forbiddenResponse** - `a5b59d4` (feat)

## Files Created/Modified

- `src/lib/audit/actions.ts` - Added 8 new audit action types (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED, SIGNUP_SUCCESS, SIGNUP_FAILED, PERMISSION_DENIED) with descriptions
- `supabase/migrations/00009_audit_log_immutability.sql` - RLS policies (INSERT allowed, SELECT scoped to admins/self, UPDATE/DELETE blocked) + immutability trigger
- `src/lib/errors/index.ts` - Extended forbiddenResponse signature with optional auditContext and targetInfo for PERMISSION_DENIED logging

## Decisions Made

**1. Fire-and-forget pattern for PERMISSION_DENIED logging**
- **Rationale:** 403 responses should be fast; audit logging is important but not critical enough to block the response
- **Implementation:** logAuditEvent wrapped in fire-and-forget with catch handler for error logging
- **Trade-off:** May lose audit logs if database fails, but prevents response delays

**2. Defense-in-depth immutability**
- **Rationale:** RLS only blocks authenticated users, not service role (Prisma uses service role)
- **Implementation:** RLS policies block UPDATE/DELETE for authenticated users + trigger blocks ALL modifications including service role
- **Benefit:** Protects against both user attempts and accidental/malicious service role modifications

**3. Backward-compatible forbiddenResponse extension**
- **Rationale:** Existing callers (88 routes) shouldn't break when audit logging added
- **Implementation:** All new parameters are optional
- **Migration path:** Routes can gradually adopt audit logging by passing context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as planned.

## User Setup Required

None - no external service configuration required.

Migration will be applied in Plan 03 when Supabase migrations are run.

## Next Phase Readiness

**Ready for Plan 03 (Auth Event Logging):**
- Auth event types (LOGIN_SUCCESS, etc.) defined and ready to use
- Immutability migration ready to deploy
- PERMISSION_DENIED logging integrated into forbiddenResponse

**Blockers:**
- None

**Concerns:**
- Migration 00009 needs to be applied to database before audit logs become immutable
- Existing forbiddenResponse calls don't pass audit context yet (will be addressed in future if needed)

**Technical debt:**
- Consider migrating all forbiddenResponse calls to pass audit context for complete PERMISSION_DENIED tracking
- May want to add similar logging to unauthorizedResponse in future

---
*Phase: 27-secrets-logging-rate-limiting*
*Completed: 2026-01-29*
