---
phase: 18-navigation-redesign
plan: 01
subsystem: ui
tags: [navigation, responsive-design, master-detail, casl, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 10-security-foundation
    provides: CASL permissions with useAbility hook for role-based filtering
  - phase: 14-design-system
    provides: CSS variables (--surface-*, --text-*, --border-*) and Tailwind classes
  - phase: 15-mobile-pwa
    provides: Responsive design patterns and mobile breakpoints (md:768px)
provides:
  - Desktop sidebar navigation with persistent section access
  - Mobile bottom navigation bar with iOS tab bar pattern
  - Master-detail layout shell wrapping all [teamSlug] pages
  - Permission-filtered navigation items using CASL
  - Active section highlighting with emerald accent
affects: [19-practice-flow, 20-equipment-enhancements, future-feature-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Master-detail layout pattern: sidebar (desktop) + bottom nav (mobile)"
    - "Permission-filtered navigation using useAbility hook"
    - "Active state detection: exact match for Home, startsWith for sections"
    - "Responsive breakpoint: 768px (md:) switches layout completely"
    - "Touch target compliance: h-16 (64px) on mobile nav items"

key-files:
  created:
    - src/components/layout/navigation-sidebar.tsx
    - src/components/layout/bottom-navigation.tsx
    - src/app/(dashboard)/[teamSlug]/layout.tsx
  modified:
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "Desktop sidebar 256px wide (w-64) for comfortable reading"
  - "Mobile bottom nav 5 items max following iOS Human Interface Guidelines"
  - "Settings excluded from mobile nav (desktop/profile only access)"
  - "Bottom padding pb-20 (80px) on mobile content for fixed nav clearance"
  - "Emerald-500 accent for active states (matches existing theme palette)"
  - "h-[calc(100vh-4rem)] accounts for header height of h-16 (4rem)"

patterns-established:
  - "Navigation components receive teamSlug prop for href construction"
  - "Active detection: exact prop for root pages, startsWith for sections"
  - "Permission filtering: items with permission object filtered via ability.can()"
  - "Nested layout pattern: [teamSlug]/layout.tsx handles navigation shell, parent layout handles auth/providers"

# Metrics
duration: 5min
completed: 2026-01-26
---

# Phase 18 Plan 01: Navigation Redesign Summary

**Persistent sidebar (desktop) and bottom nav bar (mobile) replacing card-based dashboard navigation with CASL-filtered items and emerald active states**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-26T17:57:16Z
- **Completed:** 2026-01-26T17:02:29Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Master-detail layout with persistent navigation replaces full-page card navigation
- Desktop sidebar navigation with 5 filtered items (Home, Roster, Practices, Equipment, Settings)
- Mobile bottom navigation bar with 5 items max (Home, Roster, Practices, Schedule, Equipment)
- Permission-based filtering: Equipment requires manage permission, Settings requires Team management
- Active section highlighting with emerald-500 accent color
- Responsive breakpoint at 768px switches layout completely (sidebar hidden, bottom nav shown)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create desktop navigation sidebar component** - `3936700` (feat)
2. **Task 2: Create mobile bottom navigation component** - `6114dab` (feat)
3. **Task 3: Create team layout shell with navigation** - `8dc4324` (feat)

## Files Created/Modified
- `src/components/layout/navigation-sidebar.tsx` - Desktop sidebar with 5 nav items, permission filtering, emerald active state
- `src/components/layout/bottom-navigation.tsx` - Mobile bottom nav with 5 items, h-16 touch targets, permission filtering
- `src/app/(dashboard)/[teamSlug]/layout.tsx` - Team layout shell with flex layout, responsive sidebar/bottom nav, scrollable content
- `src/app/(dashboard)/layout.tsx` - Removed container/padding from main element (now flex-1) to allow nested layout control

## Decisions Made

**Layout structure:**
- Nested layout pattern where [teamSlug]/layout.tsx handles navigation shell while parent (dashboard)/layout.tsx handles auth, providers, and header
- Parent layout's main element changed to flex-1 only, allowing nested layout to control its own layout structure

**Desktop sidebar:**
- 256px wide (w-64) provides comfortable reading width for labels
- Hidden on mobile with `hidden md:flex` pattern
- Positioned as flex column with border-right for visual separation

**Mobile bottom nav:**
- Limited to 5 items max following iOS Human Interface Guidelines for tab bars
- Settings intentionally excluded (accessible from desktop or profile menu)
- Schedule included instead (CalendarDays icon) for quick calendar access
- h-16 (64px) touch targets exceed WCAG 2.5.5 minimum of 44px

**Active state detection:**
- Home page uses exact match (pathname === href) since it's the root
- Other sections use startsWith match to highlight during child page navigation
- Emerald-500 accent chosen to match existing theme palette

**Responsive strategy:**
- Breakpoint at 768px (md:) completely switches layout approach
- Desktop: sidebar left, content center, no bottom nav
- Mobile: no sidebar, content full width with pb-20, fixed bottom nav at z-50
- h-[calc(100vh-4rem)] ensures layout fits viewport minus header height

**Permission filtering:**
- Equipment and Settings items include permission checks
- Filter approach using ability.can() simpler than wrapping in Can components
- Athletes see 4 items on mobile (no Equipment), coaches see 5

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully with no TypeScript errors or build issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 19 (Practice Flow Improvements):**
- Navigation shell in place for all team pages
- Content area properly scoped with scrolling and responsive padding
- Active state highlighting works for future practice editing pages

**Architecture notes for future phases:**
- New team pages will automatically get navigation shell (wrapped by [teamSlug]/layout.tsx)
- To add nav items: update both NavigationSidebar and BottomNavigation components
- Permission filtering pattern established for role-based nav item visibility
- Active state detection works for nested routes (e.g., /practices/[id] highlights Practices)

**No blockers or concerns.**

---
*Phase: 18-navigation-redesign*
*Completed: 2026-01-26*
