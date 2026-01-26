---
phase: 17-facility-ui-features
plan: 07
status: complete
completed: 2026-01-26
subsystem: facility-events
tags: [facility, events, cross-club, practices]
dependency-graph:
  requires: [17-02, 17-03]
  provides: [cross-club-events-api, facility-events-ui, clubs-api]
  affects: [practice-scheduling, facility-dashboard]
tech-stack:
  added: []
  patterns: [facilityEventId-metadata-tracking, practice-copy-per-club]
key-files:
  created:
    - src/app/api/facility/[facilityId]/events/route.ts
    - src/app/api/facility/[facilityId]/clubs/route.ts
    - src/app/(dashboard)/facility/[facilitySlug]/events/page.tsx
    - src/app/(dashboard)/facility/[facilitySlug]/events/new/page.tsx
    - src/app/(dashboard)/facility/[facilitySlug]/events/loading.tsx
  modified: []
decisions:
  - key: facilityEventId-metadata-tracking
    choice: Store facilityEventId in practice notes JSON field
    reason: Avoids schema changes while enabling event grouping and tracking
  - key: copy-per-club
    choice: Each club gets independent copy, can modify freely
    reason: Per CONTEXT decision - clubs need full control after creation
metrics:
  duration: ~8 minutes
---

# Phase 17 Plan 07: Cross-Club Events Summary

Cross-club event scheduling for facility admins to create events visible to multiple clubs at once.

## One-liner

Facility events API creates practice copies per club with facilityEventId tracking in notes JSON for grouping.

## What Was Built

### API Layer

1. **Events API** (`/api/facility/[facilityId]/events`)
   - GET: Lists facility-created events grouped by facilityEventId
   - POST: Creates practice for each selected club atomically
   - Validates all clubs belong to facility before creation
   - Auto-creates season for clubs without active season

2. **Clubs API** (`/api/facility/[facilityId]/clubs`)
   - GET: Returns list of clubs in facility
   - Used by event creation form for club selection

### UI Layer

1. **Events List Page** (`/facility/[slug]/events`)
   - Server component with FACILITY_ADMIN auth check
   - Groups practices by facilityEventId from notes JSON
   - Splits into upcoming and past events
   - Shows participating clubs for each event
   - Empty state with create button

2. **Event Creation Page** (`/facility/[slug]/events/new`)
   - Client component with react-hook-form validation
   - Club selection with checkboxes and select all toggle
   - Date and time inputs for scheduling
   - Optional notes field
   - Info note explaining independent club copies

3. **Loading Skeleton**
   - Matches events list layout

## Technical Approach

### Event Tracking via Metadata

Instead of creating a new FacilityEvent model, we track facility-created events by storing metadata in the practice notes field:

```json
{
  "facilityEventId": "uuid",
  "createdByFacilityId": "uuid",
  "originalNotes": "user notes"
}
```

This approach:
- Avoids schema migration
- Allows grouping events for display
- Preserves club independence (clubs can modify their copy)

### Club Independence

Per the phase CONTEXT decision, clubs get full control after creation:
- Each club receives their own Practice record
- Clubs can modify times, add notes, cancel
- Changes to one club's copy don't affect others
- Facility admin can see all copies via the events list

## Verification Results

- Build: passes
- Line counts: events/page.tsx (222), events/new/page.tsx (297), events/route.ts (231)
- API exports: GET and POST both implemented
- TypeScript: compiles without errors

## Commits

| Hash | Description |
|------|-------------|
| 9262107 | feat(17-07): create cross-club events API |
| f1d31a3 | feat(17-07): create facility events list page |
| 6ae657d | feat(17-07): create cross-club event creation page |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

- Facility events link from dashboard card already exists (from 17-02)
- Events can be viewed and created by facility admins
- Ready for 17-08 (Facility Settings) and beyond
