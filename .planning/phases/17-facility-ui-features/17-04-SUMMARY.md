---
phase: 17-facility-ui-features
plan: 04
subsystem: ui
tags: [nextjs, prisma, facility-equipment, facility-admin, crud]

# Dependency graph
requires:
  - phase: 17-01
    provides: "EquipmentBooking model and ownerType enum"
  - phase: 17-02
    provides: "Facility dashboard patterns and navigation"
  - phase: 12-facility-schema
    provides: "Equipment ownership hierarchy (FACILITY, CLUB, TEAM)"
  - phase: 13-facility-auth
    provides: "FACILITY_ADMIN role verification patterns"

provides:
  - "Facility equipment list page with availability status"
  - "Facility equipment API endpoints (GET, POST)"
  - "Facility equipment form for creating shared equipment"
  - "Helper API for facility lookup by slug"

affects: [17-05-equipment-booking, facility-management, equipment-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Facility equipment pages follow /{facilitySlug}/equipment pattern"
    - "Availability status derived from damage reports and manualUnavailable flag"
    - "Equipment grouped by type (SHELL, OAR, LAUNCH, OTHER) with collapsible sections"

key-files:
  created:
    - "src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx"
    - "src/app/(dashboard)/facility/[facilitySlug]/equipment/loading.tsx"
    - "src/app/(dashboard)/facility/[facilitySlug]/equipment/new/page.tsx"
    - "src/app/api/facility/[facilityId]/equipment/route.ts"
    - "src/app/api/facility/by-slug/[slug]/route.ts"
    - "src/components/equipment/facility-equipment-form.tsx"
  modified: []

key-decisions:
  - "Facility equipment is always isShared: true (available to all clubs)"
  - "Equipment list shows availability based on damage reports and manual unavailable flag"
  - "FacilityEquipmentForm component separate from team EquipmentForm to avoid coupling"

patterns-established:
  - "Facility pages verify viewMode === 'facility' before rendering"
  - "API routes check FACILITY_ADMIN role via FacilityMembership query"
  - "Equipment availability computed server-side with damage report aggregation"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 17 Plan 04: Facility Equipment Management Summary

**Facility admins can view and create shared equipment with availability indicators based on damage reports and manual unavailability**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T18:16:28Z
- **Completed:** 2026-01-25T18:21:19Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Equipment list page with damage/unavailability status indicators
- Equipment API endpoints with FACILITY_ADMIN authorization
- Add equipment page with shell-specific conditional fields
- Equipment grouped by type with count summaries

## Task Commits

Each task was committed atomically:

1. **Task 1: Create facility equipment list page** - `d7185c0` (feat)
2. **Task 2: Create facility equipment API endpoint** - `17cd8ff` (feat)
3. **Task 3: Create add equipment page** - `72294e2` (feat)

## Files Created/Modified
- `src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx` - Equipment list with availability status
- `src/app/(dashboard)/facility/[facilitySlug]/equipment/loading.tsx` - Loading skeleton
- `src/app/(dashboard)/facility/[facilitySlug]/equipment/new/page.tsx` - Add equipment page
- `src/app/api/facility/[facilityId]/equipment/route.ts` - GET/POST endpoints for facility equipment
- `src/app/api/facility/by-slug/[slug]/route.ts` - Helper API for client-side facility lookup
- `src/components/equipment/facility-equipment-form.tsx` - Form component for facility equipment creation

## Decisions Made
- **Separate form component:** Created FacilityEquipmentForm instead of reusing EquipmentForm to avoid coupling team and facility flows
- **Availability status:** Computed server-side from damage reports and manualUnavailable flag, displayed with colored badges and icons
- **Equipment grouping:** Grouped by type (SHELL, OAR, LAUNCH, OTHER) with count summaries at top for quick overview
- **Helper API:** Added by-slug endpoint to support client-side form submissions that need facility ID from slug

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed existing patterns from club equipment and facility dashboard pages.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Facility equipment CRUD complete
- Ready for equipment booking system (17-05) where clubs can request facility equipment
- Availability status foundation in place for booking conflict detection
- Equipment detail pages (view/edit/damage reports) can be added in future plans if needed

---
*Phase: 17-facility-ui-features*
*Completed: 2026-01-25*
