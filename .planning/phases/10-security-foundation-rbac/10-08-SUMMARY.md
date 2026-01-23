---
phase: 10-security-foundation-rbac
plan: 08
subsystem: api
tags: [api-keys, rbac, casl, audit-log, next.js]

# Dependency graph
requires:
  - phase: 10-01
    provides: ApiKey database model with hash storage
  - phase: 10-05
    provides: Audit logger with createAuditLogger helper
  - phase: 10-06
    provides: API key utility functions (createApiKey, listApiKeys, revokeApiKey)
provides:
  - API key management endpoints (create, list, revoke, get)
  - CASL permission checks for manage-api-keys action
  - Audited API key creation and revocation
affects: [10-11, admin-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - API key management with CASL permission checks
    - Audit logging for key lifecycle events
    - Raw key returned only once at creation

key-files:
  created:
    - src/app/api/api-keys/route.ts
    - src/app/api/api-keys/[id]/route.ts
  modified: []

key-decisions:
  - "Return raw API key only at creation time with explicit warning message"
  - "Use CASL ability.can('manage-api-keys', 'ApiKey') for all endpoints"

patterns-established:
  - "API key endpoints pattern: getAuthContext + ability check + audit log"
  - "Soft delete pattern: Check revokedAt is null before allowing revocation"

# Metrics
duration: 5min
completed: 2026-01-23
---

# Phase 10 Plan 08: API Key Management Endpoints Summary

**Complete API key management API with CASL permission checks, audit logging for creation/revocation, and raw key returned only once at creation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-23T00:00:00Z
- **Completed:** 2026-01-23T00:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- GET /api/api-keys lists all active API keys for the current club (prefix, name, lastUsedAt, expiresAt)
- POST /api/api-keys creates new key and returns raw value with warning message (only time shown)
- DELETE /api/api-keys/[id] soft-revokes key and creates audit log entry
- GET /api/api-keys/[id] returns details of a specific key
- All endpoints use CASL manage-api-keys permission (FACILITY_ADMIN, CLUB_ADMIN)
- All key lifecycle events are audited (API_KEY_CREATED, API_KEY_REVOKED)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API key list and create endpoints** - `065567d` (feat)
2. **Task 2: Create API key revoke endpoint** - `74a30e9` (feat)

## Files Created/Modified

- `src/app/api/api-keys/route.ts` - GET (list) and POST (create) endpoints with validation, permission checks, audit logging
- `src/app/api/api-keys/[id]/route.ts` - DELETE (revoke) and GET (details) endpoints with club scoping and audit logging

## Decisions Made

1. **Raw key with warning message** - POST response includes explicit message "Store this key securely - it will not be shown again." to ensure users understand the one-time nature.
2. **Club-scoped key access** - Keys are filtered by clubId from auth context, preventing cross-club key access.
3. **Already-revoked returns 404** - Attempting to revoke an already-revoked key returns 404 rather than success, providing clear feedback.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API key management endpoints complete and ready for admin UI integration
- All endpoints protected by CASL permissions
- Audit trail established for security compliance
- Ready for Phase 10-11 (security overview dashboard) which will display audit logs

---
*Phase: 10-security-foundation-rbac*
*Completed: 2026-01-23*
