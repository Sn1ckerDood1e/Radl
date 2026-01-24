---
phase: 16-ui-ux-polish
plan: 01
subsystem: ui
tags: [shadcn, skeleton, empty-state, loading, lucide-react]

# Dependency graph
requires:
  - phase: 14-design-system-foundation
    provides: shadcn/ui foundation with Button, Dialog, and cn utility
provides:
  - Skeleton component for loading states with pulse animation
  - EmptyState component with icon, title, description, and optional action
  - Loading.tsx files for roster, equipment, and practices pages
  - Consistent empty state pattern across 6 list pages
affects: [16-02, 16-03, future-list-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EmptyState component pattern (icon + title + description + optional action)
    - Loading.tsx skeleton pattern matching actual content layout
    - Consistent empty state styling across all list pages

key-files:
  created:
    - src/components/ui/skeleton.tsx
    - src/components/ui/empty-state.tsx
    - src/app/(dashboard)/[teamSlug]/roster/loading.tsx
    - src/app/(dashboard)/[teamSlug]/equipment/loading.tsx
    - src/app/(dashboard)/[teamSlug]/practices/loading.tsx
  modified:
    - src/app/(dashboard)/[teamSlug]/roster/page.tsx
    - src/app/(dashboard)/[teamSlug]/equipment/equipment-list-client.tsx
    - src/app/(dashboard)/[teamSlug]/practices/page.tsx
    - src/app/(dashboard)/[teamSlug]/lineup-templates/page.tsx
    - src/app/(dashboard)/[teamSlug]/practice-templates/page.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/page.tsx

key-decisions:
  - "Use shadcn skeleton component for consistent pulse animation"
  - "EmptyState component supports both href (Link) and onClick action patterns"
  - "Loading skeletons mirror actual content layout dimensions to prevent visual shift"
  - "Empty states show contextual action buttons only to coaches"

patterns-established:
  - "EmptyState pattern: icon in rounded circle (h-16 w-16, bg-zinc-800), title, description, optional action button"
  - "Loading pattern: skeleton components matching exact dimensions of actual content elements"
  - "Empty state wrapping: bg-zinc-900 border border-zinc-800 rounded-lg container around EmptyState"

# Metrics
duration: 8min
completed: 2026-01-24
---

# Phase 16 Plan 01: Loading & Empty States Foundation Summary

**shadcn Skeleton and EmptyState components with Next.js loading.tsx files for roster, equipment, and practices pages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-24T13:30:13Z
- **Completed:** 2026-01-24T13:37:57Z
- **Tasks:** 3
- **Files modified:** 11 (5 created, 6 modified)

## Accomplishments
- Created reusable Skeleton component with pulse animation via shadcn
- Created EmptyState component with icon, title, description, and optional action support
- Added loading.tsx files for roster, equipment, and practices pages with skeletons matching content layout
- Applied EmptyState component to 6 list pages (roster, equipment, practices, lineup-templates, practice-templates, regattas)
- Empty states show contextual action buttons only to coaches

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shadcn skeleton and create EmptyState component** - `7062f2c` (feat)
2. **Task 2: Create loading.tsx files for main list pages** - `a5e2785` (feat)
3. **Task 3: Apply EmptyState to existing list pages** - `9310257` (feat)

## Files Created/Modified

### Created
- `src/components/ui/skeleton.tsx` - shadcn skeleton component with pulse animation
- `src/components/ui/empty-state.tsx` - Reusable empty state with icon, title, description, optional action
- `src/app/(dashboard)/[teamSlug]/roster/loading.tsx` - Roster page skeleton (team code card + member list)
- `src/app/(dashboard)/[teamSlug]/equipment/loading.tsx` - Equipment page skeleton (usage summary + equipment grid)
- `src/app/(dashboard)/[teamSlug]/practices/loading.tsx` - Practices page skeleton (practice list)

### Modified
- `src/app/(dashboard)/[teamSlug]/roster/page.tsx` - Applied EmptyState with Users icon
- `src/app/(dashboard)/[teamSlug]/equipment/equipment-list-client.tsx` - Applied EmptyState with Ship icon and Add Equipment action
- `src/app/(dashboard)/[teamSlug]/practices/page.tsx` - Applied EmptyState with Calendar icon and New Practice action
- `src/app/(dashboard)/[teamSlug]/lineup-templates/page.tsx` - Applied EmptyState with Users icon and View Practices action
- `src/app/(dashboard)/[teamSlug]/practice-templates/page.tsx` - Applied EmptyState with FileText icon and New Template action
- `src/app/(dashboard)/[teamSlug]/regattas/page.tsx` - Applied EmptyState with Trophy icon and Add Regatta action

## Decisions Made

1. **shadcn skeleton component** - Used shadcn's official skeleton component for consistent pulse animation and styling with existing design system
2. **EmptyState action patterns** - Support both href (asChild with Link) and onClick patterns to handle navigation and custom actions
3. **Loading skeleton dimensions** - Match exact dimensions of actual content (avatar h-12 w-12 rounded-full, text h-4 w-[200px]) to prevent layout shift
4. **Coach-only actions** - Empty state action buttons only shown to coaches (isCoach check) for appropriate permissions
5. **Icon selection** - Chose semantically appropriate Lucide icons (Users for roster/lineups, Ship for equipment, Calendar for practices, FileText for templates, Trophy for regattas)
6. **Container wrapping** - Wrap EmptyState in bg-zinc-900 border border-zinc-800 rounded-lg container for consistent visual hierarchy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Issue: roster/loading.tsx file creation failed initially**
- **Problem:** Write tool call for roster/loading.tsx succeeded but file didn't appear on disk
- **Resolution:** Recreated file using bash heredoc (`cat >`) which succeeded
- **Impact:** Minor delay, no functional change

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for next plans:
- EmptyState component can be applied to remaining list pages (seasons, invitations, etc.)
- Loading.tsx pattern can be replicated for other page types
- Skeleton and EmptyState components available for future features

No blockers or concerns.

---
*Phase: 16-ui-ux-polish*
*Completed: 2026-01-24*
