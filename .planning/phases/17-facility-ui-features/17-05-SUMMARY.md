---
phase: 17-facility-ui-features
plan: 05
subsystem: api
tags: [prisma, nextjs, equipment-booking, api, conflict-detection]

# Dependency graph
requires:
  - phase: 17-01
    provides: "EquipmentBooking model with BookingStatus enum"
  - phase: 17-04
    provides: "Facility equipment management patterns"
  - phase: 12-facility-schema
    provides: "Equipment ownership hierarchy and Facility.bookingWindowDays"
  - phase: 13-facility-auth
    provides: "FACILITY_ADMIN role verification and viewMode claims"

provides:
  - "Booking helper library with conflict detection and notification"
  - "API endpoints for creating, listing, approving/denying bookings"
  - "Permission-scoped booking management (clubs cancel own, admins approve/deny)"

affects: [17-06-booking-ui, equipment-scheduling, practice-equipment-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Time range overlap detection using composite index"
    - "Facility admin notification on booking request"
    - "Booking window validation against Facility.bookingWindowDays"

key-files:
  created:
    - "src/lib/equipment/booking.ts"
    - "src/app/api/equipment/bookings/route.ts"
    - "src/app/api/equipment/bookings/[bookingId]/route.ts"
  modified:
    - "src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx"

key-decisions:
  - "Helper functions return {success, error, conflicts} pattern for consistent error handling"
  - "Re-check availability on approve to prevent race conditions between concurrent approvals"
  - "Clubs can only cancel their own bookings; facility admins can approve/deny all"
  - "Equipment must be FACILITY-owned or have isShared=true to be bookable"

patterns-established:
  - "Booking conflict detection: startTime < requestedEnd AND endTime > requestedStart"
  - "Transaction-wrapped booking creation with notification generation"
  - "viewMode-aware API: facility view shows all, club view shows club's bookings"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 17 Plan 05: Equipment Booking API Summary

**Booking helper functions and API endpoints for equipment reservation with conflict detection, approval workflow, and facility admin notifications**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T15:02:08Z
- **Completed:** 2026-01-26T15:06:24Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Booking helper library with checkAvailability, createBooking, approve/deny/cancel functions
- Conflict detection using time range overlap algorithm
- Facility admin notification on new booking requests
- Booking window validation (default 30 days, configurable per facility)
- API endpoints for CRUD operations with permission checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create booking helper functions** - `cf9dd1b` (feat)
2. **Task 2: Create bookings list and create API** - `041712a` (feat)
3. **Task 3: Create booking management API** - `ded551c` (feat)

## Files Created/Modified
- `src/lib/equipment/booking.ts` - Helper functions for booking operations
- `src/app/api/equipment/bookings/route.ts` - GET/POST for listing and creating bookings
- `src/app/api/equipment/bookings/[bookingId]/route.ts` - GET/PATCH/DELETE for single booking operations
- `src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx` - Fixed Lucide icon prop error

## Decisions Made
- **Conflict detection scope:** Check only PENDING and APPROVED bookings (DENIED/CANCELLED don't block)
- **Re-validation on approve:** Race condition protection by re-checking availability before approval
- **Notification routing:** Facility admins receive EQUIPMENT_REQUEST notifications with link to requests page
- **Cancel vs Deny:** Clubs cancel their own bookings (CANCELLED status), admins deny requests (DENIED status with reason)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Lucide icon title prop error**
- **Found during:** Verification (npm run build)
- **Issue:** Lucide icons don't accept `title` prop directly in newer versions
- **Fix:** Moved title attribute to parent div wrapper
- **Files modified:** `src/app/(dashboard)/facility/[facilitySlug]/equipment/page.tsx`
- **Commit:** `228783e`

## Issues Encountered

None beyond the auto-fixed Lucide icon issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Booking helper functions ready for UI consumption
- API endpoints complete for booking list, create, approve, deny, cancel, delete
- Ready for booking UI (17-06) to display booking requests and calendar
- Ready for practice integration to auto-book equipment when creating practices

---
*Phase: 17-facility-ui-features*
*Completed: 2026-01-26*
