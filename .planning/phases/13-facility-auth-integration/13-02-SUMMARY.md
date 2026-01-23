---
phase: 13-facility-auth-integration
plan: 02
subsystem: auth
tags: [facility, context-switch, cookies, viewmode, casl, rbac]

# Dependency graph
requires:
  - phase: 12-facility-schema-migration
    provides: Facility and FacilityMembership models with FACILITY_ADMIN role
  - phase: 13-facility-auth-integration
    plan: 01
    provides: Extended ability factory with viewMode-based permission scoping
provides:
  - Unified context switch API endpoint for facility and club views
  - ViewMode derivation in claims helper from cookie state
  - Atomic cookie updates with membership verification
affects: [facility-ui, dashboard-layouts, navigation, permission-checks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "viewMode derivation from cookie state (facilityId + clubId combination)"
    - "Unified context switch endpoint pattern (single endpoint, multiple modes)"
    - "Atomic cookie updates in API response (setCurrentFacilityId + setCurrentClubId)"

key-files:
  created:
    - src/app/api/context/switch/route.ts
  modified:
    - src/lib/auth/claims.ts

key-decisions:
  - "Single /api/context/switch endpoint handles both facility-level and club-level switches"
  - "ViewMode derived from cookie state (not stored separately)"
  - "Facility-level view requires FACILITY_ADMIN role, club view requires ClubMembership"

patterns-established:
  - "ViewMode computation: facilityId only = 'facility', facilityId + clubId = 'club', clubId only = 'club' (legacy), none = null"
  - "Context switch verification: FacilityMembership for facility view, ClubMembership for club view"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 13 Plan 02: Context Switch & ViewMode Summary

**Unified context switch API with atomic cookie updates and viewMode derivation from facility/club cookie state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T20:01:25Z
- **Completed:** 2026-01-23T20:04:14Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created unified /api/context/switch endpoint handling facility-level and club-level switches
- Added viewMode field to ClaimsResult with derivation logic from cookie state
- Implemented membership verification for both facility and club context switches
- Atomic cookie updates (facility + club) in single API response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified context switch API** - `e883f8a` (feat)
2. **Task 2: Update getClaimsForApiRoute with viewMode derivation** - `e828c4c` (feat)

**Plan metadata:** (docs: complete plan - to be committed)

## Files Created/Modified
- `src/app/api/context/switch/route.ts` - Unified context switch endpoint with facility and club view support
- `src/lib/auth/claims.ts` - Added viewMode field and derivation logic to ClaimsResult

## Decisions Made

**1. Single endpoint for all context switches**
- Rationale: Simpler client-side logic, consistent pattern for switching between facility and club views

**2. ViewMode derived from cookie state (not stored separately)**
- Rationale: Single source of truth (cookies), no state synchronization issues, computed on demand

**3. Facility-level view requires FACILITY_ADMIN role**
- Rationale: Only facility admins should access facility-wide data; follows principle of least privilege

**4. ViewMode computation pattern**
- `facilityId` only → `'facility'` (facility-level view)
- `facilityId` + `clubId` → `'club'` (club view within facility)
- `clubId` only → `'club'` (legacy team-only path)
- Neither → `null` (no facility context)
- Rationale: Clear derivation rules from cookie state, backward compatible with legacy team-only mode

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Facility dashboard layouts (can use viewMode from getClaimsForApiRoute)
- Navigation components (can call /api/context/switch)
- Permission-scoped UI (ability factory receives viewMode from UserContext)

**Notes:**
- ViewMode is now available in ClaimsResult for all API routes and layouts
- Context switch API verifies membership before allowing switch (security enforced)
- Cookies updated atomically with response (no race conditions)

---
*Phase: 13-facility-auth-integration*
*Completed: 2026-01-23*
