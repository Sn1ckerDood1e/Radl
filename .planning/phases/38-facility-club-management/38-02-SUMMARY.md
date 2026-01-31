---
phase: 38
plan: 02
subsystem: admin-api
tags: [clubs, api, crud, admin, audit]
dependency-graph:
  requires: [38-01]
  provides: [club-management-api]
  affects: [38-03, 38-04, 39-*]
tech-stack:
  added: []
  patterns: [admin-api-crud, cascade-delete-confirmation, audit-logging]
key-files:
  created:
    - src/lib/validations/club.ts
    - src/app/api/admin/clubs/route.ts
    - src/app/api/admin/clubs/[clubId]/route.ts
    - src/app/api/admin/clubs/[clubId]/move/route.ts
  modified:
    - src/lib/audit/actions.ts
decisions:
  - id: club-model-is-team
    date: 2026-01-31
    outcome: Prisma Team model represents clubs; UI says "club" consistently
  - id: move-endpoint-separate
    date: 2026-01-31
    outcome: Facility change via /move endpoint, not PATCH, for explicit audit trail
  - id: cascade-delete-confirmation
    date: 2026-01-31
    outcome: DELETE without ?confirm returns impact counts; requires ?confirm=true to execute
metrics:
  duration: 5m15s
  completed: 2026-01-31
---

# Phase 38 Plan 02: Club Management API Summary

Complete REST API for super admin club (rowing team) management with CRUD operations, facility filtering, move support, and full audit logging.

## One-liner

Club management API with list/create/detail/update/delete/move endpoints for super admin panel

## What Was Built

### Validation Schemas (src/lib/validations/club.ts)

- **createClubSchema**: name, slug (optional auto-gen), facilityId, colors with teal defaults
- **updateClubSchema**: partial updates (excludes facilityId for safety)
- **moveClubSchema**: targetFacilityId for facility transfer

### List & Create API (src/app/api/admin/clubs/route.ts)

- **GET**: List all clubs with member counts, facility info, pagination
- **GET ?facilityId=X**: Filter clubs by specific facility
- **POST**: Create club with auto-generated slug/joinCode, creates TeamSettings

### Detail/Update/Delete API (src/app/api/admin/clubs/[clubId]/route.ts)

- **GET**: Club detail with facility, settings, member/equipment counts
- **PATCH**: Update name, slug, colors, logo (not facilityId)
- **DELETE**: Without confirm returns cascade impact; with ?confirm=true deletes

### Move API (src/app/api/admin/clubs/[clubId]/move/route.ts)

- **POST**: Transfer club between facilities
- Logs ADMIN_CLUB_UPDATED with metadata.action='MOVE_CLUB'

## Requirements Satisfied

| Requirement | Description | Status |
|-------------|-------------|--------|
| CLUB-01 | List all clubs with member counts | Complete |
| CLUB-02 | Create club assigned to facility | Complete |
| CLUB-03 | View club details | Complete |
| CLUB-04 | Update club details | Complete |
| CLUB-05 | Delete club with cascade warning | Complete |
| CLUB-06 | Move club between facilities | Complete |

## Verification

- All TypeScript compiles without errors
- All handlers use getSuperAdminContext() for auth
- All mutations log to audit via createAdminAuditLogger
- prisma.team queries match expected patterns
- MOVE_CLUB metadata present in move endpoint audit

## Decisions Made

### Club Model Is Team
- Prisma schema uses `Team` model, UI consistently says "club"
- No schema change needed, just naming convention

### Move Endpoint Separate
- Facility transfer via explicit /move endpoint
- Not allowed via PATCH to prevent accidental changes
- Clear audit trail with MOVE_CLUB metadata

### Cascade Delete Confirmation
- DELETE without ?confirm returns impact summary
- Member count, equipment count, practices, seasons, invitations
- Must explicitly pass ?confirm=true to execute deletion

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

- Club colors default to teal-500/900 for new clubs
- JoinCode generated with nanoid (8 chars, no ambiguous chars)
- Slug auto-generated from name if not provided
- TeamSettings record created with club (required relation)
- Move endpoint validates both source and target facilities

## Files Changed

```
src/lib/validations/club.ts          (created) - 80 lines
src/app/api/admin/clubs/route.ts     (created) - 264 lines
src/app/api/admin/clubs/[clubId]/route.ts (created) - 380 lines
src/app/api/admin/clubs/[clubId]/move/route.ts (created) - 165 lines
```

## Next Phase Readiness

Ready to proceed with:
- 38-03: Club management UI (uses these APIs)
- 38-04: Facility management UI
- 39-*: Membership management (depends on club APIs)
