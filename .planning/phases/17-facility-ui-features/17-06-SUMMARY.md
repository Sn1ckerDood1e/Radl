---
phase: 17-facility-ui-features
plan: 06
subsystem: ui
tags: [nextjs, react, equipment-booking, approval-workflow, facility-admin]

# Dependency graph
requires:
  - phase: 17-05
    provides: "Equipment booking API with approve/deny endpoints"
  - phase: 17-04
    provides: "Facility equipment management pages"
  - phase: 14-design-system
    provides: "shadcn Button component with variants"

provides:
  - "Equipment requests approval page for facility admins"
  - "EquipmentRequestPanel component for approve/deny workflow"
  - "Pending request count badge link on equipment list"

affects: [booking-calendar-ui, club-equipment-requests, practice-equipment-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client component with useState for optimistic UI updates"
    - "Invitation-style approve/deny workflow with reason input"
    - "Pending request count badge in header navigation"

key-files:
  created:
    - "src/components/facility/equipment-request-panel.tsx"
    - "src/app/(dashboard)/facility/[facilitySlug]/equipment/requests/page.tsx"
  modified:
    - "src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx"

key-decisions:
  - "Panel handles both pending and processed bookings in single view"
  - "Deny flow expands inline with optional reason input"
  - "Optimistic UI updates status immediately after API success"
  - "Pending badge only shows when count > 0 (hidden otherwise)"

patterns-established:
  - "Booking approval UI follows invitation approval pattern from invitations-client.tsx"
  - "Date serialization for client components (toISOString for all dates)"
  - "Conditional header links with count badges for actionable items"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 17 Plan 06: Equipment Requests Page Summary

**Equipment booking approval UI where facility admins can view, approve, or deny booking requests from clubs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T15:08:18Z
- **Completed:** 2026-01-26T15:12:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- EquipmentRequestPanel client component with approve/deny workflow
- Equipment requests page showing pending and processed bookings
- Deny flow with expandable reason input
- Pending request count badge link from equipment list page
- Optimistic UI updates on approve/deny actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create equipment request panel component** - `63789d4` (feat)
2. **Task 2: Create equipment requests page** - `c30941d` (feat)

## Files Created/Modified
- `src/components/facility/equipment-request-panel.tsx` - Reusable panel with approve/deny actions (279 lines)
- `src/app/(dashboard)/facility/[facilitySlug]/equipment/requests/page.tsx` - Requests approval page (109 lines)
- `src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx` - Added pending request count and link

## Decisions Made
- **Panel structure:** Single panel handles both pending and recent activity sections
- **Deny workflow:** Inline expansion with optional reason rather than modal dialog
- **UI updates:** Optimistic updates to local state after successful API calls
- **Badge visibility:** Pending count badge only shown when > 0 to reduce clutter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Equipment requests approval UI complete
- Ready for booking calendar integration (17-07)
- Ready for club-side booking request UI
- Foundation for practice-equipment auto-booking

---
*Phase: 17-facility-ui-features*
*Completed: 2026-01-26*
