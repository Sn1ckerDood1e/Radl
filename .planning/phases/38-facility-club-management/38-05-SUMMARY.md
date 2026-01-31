---
phase: 38-facility-club-management
plan: 05
subsystem: admin-ui
tags: [admin-panel, clubs, facility-management, server-components]
requires: [38-02]
provides:
  - Club list admin page with facility filter
  - Club detail admin page with stats and settings
  - Club actions dropdown component
affects: [38-06]
tech-stack:
  patterns:
    - URL-based filtering with searchParams
    - Server component fetch with cookie forwarding
    - Client component for interactive dropdowns
key-files:
  created:
    - src/app/(admin)/admin/clubs/page.tsx
    - src/app/(admin)/admin/clubs/loading.tsx
    - src/app/(admin)/admin/clubs/[clubId]/page.tsx
    - src/app/(admin)/admin/clubs/[clubId]/loading.tsx
    - src/app/(admin)/admin/clubs/[clubId]/not-found.tsx
    - src/components/admin/clubs/club-list-table.tsx
    - src/components/admin/clubs/club-actions-dropdown.tsx
    - src/components/admin/clubs/facility-filter.tsx
decisions: []
metrics:
  duration: 15min
  completed: 2026-01-31
---

# Phase 38 Plan 05: Club List and Detail Pages Summary

Admin UI for browsing and viewing clubs globally or filtered by facility.

## What Was Built

### Club List Page (`/admin/clubs`)

Server component with URL-based facility filtering:

1. **FacilityFilter dropdown** - Select dropdown to filter clubs by facility
   - "All Facilities" option shows all clubs
   - Selecting facility navigates to `?facilityId=xxx`
   - Fetches facilities list from `/api/admin/facilities`

2. **ClubListTable** - Table with columns:
   - Name (link to detail page, shows slug below)
   - Facility (link to facility detail)
   - Members count
   - Join Code (monospace styled)
   - Created date
   - Actions dropdown

3. **Pagination** - Previous/Next navigation preserving filter state

4. **Empty state** - Building icon with create button when no clubs

### Club Detail Page (`/admin/clubs/[clubId]`)

Server component showing full club information:

1. **Breadcrumb** - Navigation back to clubs list

2. **Header** - Club name with facility badge and edit button

3. **Stats row** - Three cards showing:
   - Members count
   - Equipment count
   - Created date

4. **Info section**:
   - Join Code with description
   - Slug with description
   - Club colors display (primary/secondary)

5. **Settings section** (if available):
   - Damage notification recipients count
   - Readiness thresholds (Inspect Soon, Needs Attention, Out of Service)

### Club Actions Dropdown

Client component with four actions:
- View Details - Navigate to detail page
- Edit - Navigate to edit page
- Move to Another Facility - Triggers callback
- Delete - Triggers callback (destructive styling)

Move and delete dialogs to be implemented in 38-06.

## Commits

| Hash | Message |
|------|---------|
| 1a269cb | feat(38-05): add club list page with facility filter |
| 9678839 | feat(38-05): add club actions dropdown component |
| 783389c | feat(38-05): add club detail page with stats and settings |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added FacilityFilter component**

- **Found during:** Task 1
- **Issue:** Plan specified using Select component directly; separate component provides better encapsulation
- **Fix:** Created dedicated FacilityFilter client component
- **Files created:** src/components/admin/clubs/facility-filter.tsx
- **Commit:** 1a269cb

## Verification

- [x] `npm run build` succeeds
- [x] `/admin/clubs` shows club list with facility filter
- [x] Selecting facility in dropdown filters the list
- [x] Clicking club name navigates to detail page
- [x] Detail page shows facility association and stats
- [x] Actions dropdown has all four menu items

## Next Phase Readiness

Plan 38-06 can proceed to implement:
- Club edit page
- Move club dialog (uses onMoveClick callback)
- Delete club dialog (uses onDeleteClick callback)

All UI components and navigation are in place.
