---
phase: 12-facility-schema-migration
plan: 01
subsystem: database
tags: [prisma, postgres, facility, multi-tenant, schema]

# Dependency graph
requires:
  - phase: 10-security-foundation
    provides: ClubMembership model, Role enum with FACILITY_ADMIN
provides:
  - Facility model with profile fields (location, contact, branding, billing)
  - FacilityMembership model for facility-level roles
  - EquipmentOwnerType enum (FACILITY, CLUB, TEAM)
  - BillingType enum (FACILITY, CLUB, HYBRID)
  - Team.facilityId foreign key for club-to-facility linking
  - Equipment ownership hierarchy (ownerType, facilityId, clubId, isShared)
affects:
  - 12-02 (facility auth integration)
  - 13-facility-api (CRUD endpoints for Facility model)
  - 17-facility-ui (facility management UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expand-migrate-contract: New fields nullable for backward compat"
    - "Equipment ownership hierarchy via ownerType enum + three FKs"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/app/api/equipment/[id]/damage-reports/route.ts
    - src/app/report/[equipmentId]/page.tsx

key-decisions:
  - "Team.facilityId nullable for backward compat (existing teams have no facility)"
  - "Equipment.teamId now nullable for facility-owned equipment"
  - "Three ownership levels: FACILITY (shared), CLUB (exclusive), TEAM (legacy)"
  - "Used db push workflow (no migration files) consistent with existing project"

patterns-established:
  - "Nullable FKs for new hierarchy relationships during migration period"
  - "Equipment ownership resolved by ownerType enum, not presence of FK"

# Metrics
duration: 8min
completed: 2026-01-23
---

# Phase 12 Plan 01: Facility Schema Migration Summary

**Prisma schema extended with Facility model, FacilityMembership, and Equipment ownership hierarchy for multi-facility tenancy**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T18:29:21Z
- **Completed:** 2026-01-23T18:37:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Facility model with full profile fields (location, contact, branding, billing type)
- FacilityMembership model for facility-level roles (FACILITY_ADMIN)
- Equipment ownership hierarchy with FACILITY/CLUB/TEAM owner types
- Team model linked to Facility via facilityId foreign key
- Backward compatibility maintained (existing data unaffected)

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Facility model, enums, Team/Equipment updates** - `d29d275` (feat)
2. **Task 3: Database push + type fixes** - `aa88eb3` (fix)

**Plan metadata:** (pending)

## Files Created/Modified

- `prisma/schema.prisma` - Added Facility, FacilityMembership models; BillingType, EquipmentOwnerType enums; Team.facilityId; Equipment ownership fields
- `src/app/api/equipment/[id]/damage-reports/route.ts` - Handle nullable teamId
- `src/app/report/[equipmentId]/page.tsx` - Handle nullable team relation

## Decisions Made

- **Nullable facilityId on Team:** Allows existing teams to continue working without facility assignment
- **Nullable teamId on Equipment:** Supports facility-owned equipment that isn't team-specific
- **Equipment ownerType enum:** Explicit ownership type rather than inferring from which FK is set
- **db push workflow:** Project uses db push (no migration files) - followed existing pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript errors from nullable teamId**
- **Found during:** Task 3 (after db push regenerated Prisma client)
- **Issue:** Making Equipment.teamId nullable caused type errors in damage report routes
- **Fix:** Added null checks before using teamId, early return 400 for facility equipment
- **Files modified:** src/app/api/equipment/[id]/damage-reports/route.ts, src/app/report/[equipmentId]/page.tsx
- **Verification:** TypeScript type check passes (`npx tsc --noEmit`)
- **Committed in:** aa88eb3

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix for correctness. Making teamId optional was planned but downstream TypeScript errors needed handling.

## Issues Encountered

- **Prisma migrate dev requires interactive mode:** Used `prisma db push` instead, consistent with project's existing workflow (no migrations folder existed)
- **Task 1/2 interdependency:** Facility model references Equipment relation; Equipment updates needed simultaneously for validation to pass. Committed together.

## User Setup Required

None - no external service configuration required. Schema changes applied automatically via db push.

## Next Phase Readiness

- **Ready:** Facility and FacilityMembership tables exist in database
- **Ready:** Equipment ownership hierarchy fields populated with defaults (ownerType=TEAM, isShared=false)
- **Ready:** Prisma client regenerated with new types
- **Next:** Phase 12-02 can add facility auth integration (JWT claims, permission checks)

---
*Phase: 12-facility-schema-migration*
*Completed: 2026-01-23*
