---
phase: 10-security-foundation-rbac
plan: 01
subsystem: database
tags: [prisma, rbac, audit-log, api-keys, multi-tenant]

# Dependency graph
requires: []
provides:
  - Extended Role enum with FACILITY_ADMIN and CLUB_ADMIN
  - ClubMembership model for multi-club membership with role arrays
  - AuditLog model for security-critical operation tracking
  - ApiKey model for external integration authentication
affects: [10-02, 10-03, 10-04, 10-05, 10-06, 10-07, 10-08, 10-09, 10-10, 10-11, 12, 13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Role array pattern for multi-role membership
    - SHA-256 hash storage for API keys
    - Composite indexes for time-range queries (audit retention)

key-files:
  created: []
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Preserve TeamMember model for backward compatibility during migration"
  - "Use Role[] array in ClubMembership for multi-role support per club"
  - "AuditLog uses clubId for tenant scoping (future: facilityId)"
  - "ApiKey uses keyHash unique constraint for O(1) lookup"

patterns-established:
  - "Expand-migrate-contract: Add new models alongside existing, migrate later"
  - "Audit log indexing: clubId, userId, createdAt, and composite clubId+createdAt for 365-day retention queries"
  - "API key storage: Store SHA-256 hash, never plaintext; keyPrefix for identification"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 10 Plan 01: RBAC Database Schema Summary

**Extended Prisma schema with 5-role enum, ClubMembership model for multi-club support, AuditLog for security tracking, and ApiKey for external integration authentication**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T20:30:00Z
- **Completed:** 2026-01-22T20:34:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Extended Role enum from 3 to 5 values (added FACILITY_ADMIN, CLUB_ADMIN)
- Added ClubMembership model with Role[] array supporting multiple roles per user per club
- Added AuditLog model with optimized indexes for 365-day retention queries
- Added ApiKey model with SHA-256 hash storage pattern for secure key management
- Generated Prisma client with new types and pushed schema to database

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Role enum and add ClubMembership model** - `8180257` (feat)
2. **Task 2: Add AuditLog and ApiKey models** - `fcfb5d3` (feat)
3. **Task 3: Generate Prisma client and push schema** - No commit needed (generated files gitignored, db push is runtime operation)

## Files Created/Modified

- `prisma/schema.prisma` - Extended with Role enum (5 values), ClubMembership, AuditLog, ApiKey models
- `src/generated/prisma/*` - Regenerated Prisma client (gitignored)

## Decisions Made

1. **Preserve TeamMember model** - Kept existing TeamMember alongside new ClubMembership for backward compatibility. Data migration will happen in a later plan.
2. **Role array for multi-role** - ClubMembership uses `Role[]` allowing a single user to have COACH + ATHLETE roles in the same club.
3. **Tenant scoping via clubId** - AuditLog and ApiKey use clubId (referencing Team.id) for current team-based tenancy. Will extend to facilityId when facility model is added in Phase 12.
4. **SHA-256 for API keys** - ApiKey stores hash in keyHash field with unique constraint. Original key is only shown once at creation time.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Database schema foundation complete for RBAC implementation
- ClubMembership model ready for CASL ability definitions (Plan 02)
- AuditLog model ready for audit middleware (Plan 05)
- ApiKey model ready for API key authentication service (Plan 06)
- All existing functionality preserved (TeamMember still works)

---
*Phase: 10-security-foundation-rbac*
*Completed: 2026-01-22*
