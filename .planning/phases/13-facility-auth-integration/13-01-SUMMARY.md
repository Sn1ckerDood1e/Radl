---
phase: 13-facility-auth-integration
plan: 01
subsystem: auth
tags: [casl, rbac, permissions, facility, viewMode]

# Dependency graph
requires:
  - phase: 12-facility-schema-migration
    provides: Facility model, FacilityMembership, JWT claims with facility_id
provides:
  - Extended UserContext with facilityId and viewMode fields
  - defineAbilityFor function handling viewMode-based permission scoping
  - FACILITY_ADMIN permissions varying by viewMode (facility vs club drill-down)
  - Facility subject available for CASL ability checks
affects: [13-02-facility-context-ui, 13-03-facility-switcher, facility-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "viewMode-based permission scoping for hierarchical access control"
    - "Backward-compatible interface extension (optional facilityId, null viewMode)"

key-files:
  created: []
  modified:
    - src/lib/permissions/ability.ts
    - src/lib/permissions/subjects.ts
    - src/lib/auth/get-auth-context.ts

key-decisions:
  - "viewMode='facility': broad read access to all clubs in facility"
  - "viewMode='club': scoped read-only access to specific club (drill-down)"
  - "viewMode=null: legacy behavior for backward compatibility"
  - "No-inheritance RBAC enforced: FACILITY_ADMIN cannot create lineups/practices without COACH role"

patterns-established:
  - "viewMode enum pattern ('facility' | 'club' | null) for hierarchical permission scoping"
  - "Backward-compatible extension pattern: optional facilityId, null viewMode default"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 13 Plan 01: CASL Ability Factory - Facility Hierarchy Summary

**Extended CASL ability factory with viewMode-based permission scoping for FACILITY_ADMIN read-only drill-down pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T19:55:30Z
- **Completed:** 2026-01-23T19:58:26Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extended UserContext interface with facilityId and viewMode fields
- Implemented viewMode-based permission logic for FACILITY_ADMIN role
- Added Facility subject to CASL subjects for facility profile management
- Maintained backward compatibility with legacy team-only mode (viewMode=null)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend UserContext with facility fields** - `48b4f4d` (feat)
2. **Task 3: Add Facility subject to CASL subjects** - `cfa3833` (feat)
3. **Task 2: Update defineAbilityFor with viewMode logic** - `a085fa9` (feat)

## Files Created/Modified
- `src/lib/permissions/ability.ts` - Extended UserContext with facilityId/viewMode, added viewMode conditional logic for FACILITY_ADMIN
- `src/lib/permissions/subjects.ts` - Added Facility to AppSubjects type union and SUBJECTS array
- `src/lib/auth/get-auth-context.ts` - Updated UserContext construction to include viewMode (null for backward compat)

## Decisions Made

**viewMode semantics:**
- `'facility'`: FACILITY_ADMIN viewing at facility level - broad read access to all clubs, can manage facility profile
- `'club'`: FACILITY_ADMIN drilling into specific club - scoped read-only access, no management permissions
- `null`: Legacy team-only mode for backward compatibility

**No-inheritance RBAC enforcement:**
- FACILITY_ADMIN cannot create/update lineups or practices regardless of viewMode
- Must have explicit COACH role to create/edit practices and lineups
- Aligns with v2.0 design decision for explicit role assignment

**Backward compatibility:**
- facilityId is optional (undefined for team-only installs)
- viewMode defaults to null (legacy behavior)
- API key auth sets viewMode=null (no facility context)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation succeeded throughout, all verifications passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase (13-02: Facility Context Management):**
- UserContext accepts facilityId and viewMode
- defineAbilityFor correctly scopes permissions based on viewMode
- Facility subject available for CASL checks
- AbilityProvider automatically handles extended UserContext type

**Foundation complete for:**
- Facility context cookie management (13-02)
- Facility/club switcher UI (13-03)
- Server-side ability checks with viewMode (future API routes)

**No blockers or concerns.**

---
*Phase: 13-facility-auth-integration*
*Completed: 2026-01-23*
