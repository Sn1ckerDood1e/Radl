---
phase: 36-admin-foundation-auth
plan: 04
subsystem: admin
tags: [admin, routes, layout, mfa, sidebar, dashboard]

# Dependency graph
requires:
  - phase: 36-01
    provides: SuperAdmin model in Prisma schema
  - phase: 36-02
    provides: requireSuperAdmin(), isSuperAdmin() for auth
provides:
  - Admin route group with protected layout
  - Admin dashboard with platform stats
  - Admin Panel link in user menu for super admins
affects: [admin-users, admin-facilities, admin-clubs, admin-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin route group (admin) isolated from dashboard"
    - "Database-verified super admin with MFA enforcement"
    - "JWT claim check for fast UI display (is_super_admin)"
    - "User menu dropdown with conditional admin link"

key-files:
  created:
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/page.tsx
    - src/components/admin/admin-sidebar.tsx
    - src/components/admin/admin-header.tsx
    - src/components/admin/platform-stats.tsx
  modified:
    - src/components/layout/dashboard-header.tsx
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "MFA required for admin access - redirect to /mfa-setup or /mfa-verify"
  - "User menu added to dashboard header for sign out and admin access"
  - "CASL AbilityProvider wraps admin routes with isSuperAdmin: true"
  - "Platform stats from Prisma groupBy for unique user count"

patterns-established:
  - "Admin layout: requireSuperAdmin() + MFA check before render"
  - "Admin sidebar: Fixed navigation with active state highlighting"
  - "Super admin UI check: JWT claim parsing for fast display"

# Metrics
duration: 7min
completed: 2026-01-31
---

# Phase 36 Plan 04: Admin Route Group Summary

**Admin route group with MFA-protected layout, dashboard with platform stats, and Admin Panel link for super admins**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-31T01:15:35Z
- **Completed:** 2026-01-31T01:22:19Z
- **Tasks:** 4
- **Files created:** 5
- **Files modified:** 2

## Accomplishments

- Created admin route group at `(admin)` with protected layout
- Admin layout verifies super admin status (database) and MFA enrollment
- Admin sidebar with navigation: Dashboard, Users, Facilities, Clubs, Audit Log
- Admin header with "Radl Admin" branding and Super Admin badge
- Platform dashboard showing user count, facility count, club count
- Recent admin activity table from PLATFORM-level audit logs
- Added user menu dropdown to dashboard header
- Admin Panel link visible to super admins in user menu

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin layout with super admin and MFA verification** - `149154b` (feat)
2. **Task 2: Create admin sidebar and header components** - `31cf224` (feat)
3. **Task 3: Create admin dashboard page with platform stats** - `6fb10f1` (feat)
4. **Task 4: Add Admin Panel link to dashboard header for super admins** - `ec5ed5d` (feat)

## Files Created

- `src/app/(admin)/layout.tsx` - Admin layout with requireSuperAdmin() and MFA verification
- `src/app/(admin)/page.tsx` - Admin dashboard with platform stats and recent activity
- `src/components/admin/admin-sidebar.tsx` - Navigation sidebar with 5 nav items
- `src/components/admin/admin-header.tsx` - Header with branding and user email
- `src/components/admin/platform-stats.tsx` - Stats cards for users, facilities, clubs

## Files Modified

- `src/components/layout/dashboard-header.tsx` - Added user menu with Admin Panel link
- `src/app/(dashboard)/layout.tsx` - Parse JWT claims for is_super_admin

## Decisions Made

- **MFA enforcement:** Super admins without TOTP are redirected to /mfa-setup with required=admin param
- **MFA verification:** AAL1 sessions redirected to /mfa-verify with redirect=/admin param
- **User menu addition:** Added dropdown with sign out and conditional Admin Panel link
- **Platform stats:** Use Prisma groupBy to count unique users across ClubMembership

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Added Sign Out option to user menu**

- **Found during:** Task 4
- **Issue:** Dashboard header had no way for users to sign out
- **Fix:** Added Sign out menu item in user dropdown
- **Files modified:** src/components/layout/dashboard-header.tsx
- **Commit:** ec5ed5d

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin route group fully functional at /admin
- Users, Facilities, Clubs, Audit nav items ready for Phase 37-40 implementation
- Super admins can navigate between admin panel and regular app
- MFA enforcement active for admin access

---
*Phase: 36-admin-foundation-auth*
*Completed: 2026-01-31*
