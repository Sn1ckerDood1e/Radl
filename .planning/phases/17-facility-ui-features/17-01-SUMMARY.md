---
phase: 17-facility-ui-features
plan: 01
subsystem: database
tags: [prisma, postgresql, schema, equipment-booking]

# Dependency graph
requires:
  - phase: 12-facility-schema-migration
    provides: Equipment ownership hierarchy (FACILITY, CLUB, TEAM) and Facility model
provides:
  - EquipmentBooking model for tracking reservations with approval workflow
  - BookingStatus enum (PENDING, APPROVED, DENIED, CANCELLED)
  - Facility.bookingWindowDays configuration for advance booking limits
  - EQUIPMENT_REQUEST notification type for booking notifications
affects: [17-02-booking-api, 17-03-booking-ui, facility-equipment-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Equipment booking with time ranges and status workflow"
    - "Facility configuration for booking windows"
    - "Practice-linked automatic bookings via optional practiceId"

key-files:
  created: []
  modified:
    - prisma/schema.prisma

key-decisions:
  - "BookingStatus enum includes CANCELLED for requester-initiated cancellations separate from DENIED (admin rejection)"
  - "Optional practiceId field allows linking bookings to practices for automatic reservation"
  - "approvedBy and deniedReason fields track approval workflow history"
  - "Indexed on (equipmentId, startTime, endTime) for efficient conflict detection queries"

patterns-established:
  - "Booking workflow: PENDING → APPROVED/DENIED, plus CANCELLED state"
  - "Facility.bookingWindowDays: default 30 days advance booking limit"
  - "Equipment bookings cascade delete with equipment but set null on practice deletion"

# Metrics
duration: 3min
completed: 2026-01-25
---

# Phase 17 Plan 01: Equipment Booking Schema Summary

**EquipmentBooking model with approval workflow, time-based reservations, and facility booking window configuration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-25T18:08:23Z
- **Completed:** 2026-01-25T18:11:15Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Created EquipmentBooking model with time ranges, status workflow, and audit fields
- Added BookingStatus enum (PENDING, APPROVED, DENIED, CANCELLED) for reservation states
- Extended Facility model with bookingWindowDays field (default 30) for advance booking limits
- Added EQUIPMENT_REQUEST to NotificationType enum for booking request alerts
- Established database indexes for efficient conflict detection on time ranges

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EquipmentBooking model and supporting schema** - `34b46d5` (feat)
2. **Task 2: Generate Prisma client and verify types** - _No commit (generated files in .gitignore)_
3. **Task 3: Push schema to database** - _No commit (db push for development)_

## Files Created/Modified
- `prisma/schema.prisma` - Added EquipmentBooking model, BookingStatus enum, Facility.bookingWindowDays, EQUIPMENT_REQUEST notification type, and relations to Equipment/Team/Practice models

## Decisions Made

**1. BookingStatus includes CANCELLED state**
- Rationale: Distinguish between requester cancellations (CANCELLED) and admin rejections (DENIED) for better audit trail and analytics

**2. Optional practiceId field**
- Rationale: Allows automatic bookings when creating practices with equipment assignments, while supporting standalone ad-hoc bookings

**3. Approval audit fields (requestedBy, approvedBy, deniedReason)**
- Rationale: Track who requested and who approved for accountability and conflict resolution

**4. Composite index on (equipmentId, startTime, endTime)**
- Rationale: Enables efficient time-range overlap queries for conflict detection without table scans

**5. bookingWindowDays at facility level**
- Rationale: Facility-level configuration allows different boathouses to have different advance booking policies

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - schema changes applied cleanly to database.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 17-02 (Booking API):**
- EquipmentBooking model available for CRUD operations
- BookingStatus enum ready for status transitions
- Database indexes in place for conflict detection queries
- Facility.bookingWindowDays available for validation logic

**Key considerations for next phase:**
- Implement time-range overlap detection using composite index
- Validate booking requests against Facility.bookingWindowDays limit
- Generate EQUIPMENT_REQUEST notifications on new bookings
- Handle practice deletion with SetNull behavior on bookings

---
*Phase: 17-facility-ui-features*
*Completed: 2026-01-25*
