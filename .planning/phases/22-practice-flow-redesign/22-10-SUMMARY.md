---
phase: 22-practice-flow-redesign
plan: 10
subsystem: practices
tags: [view-toggle, calendar, list, consolidation, redirect]
depends_on:
  requires: ["22-08"]
  provides:
    - Unified practices page with calendar/list view toggle
    - Schedule page redirect for backward compatibility
  affects: []
tech_stack:
  added: []
  patterns:
    - Pill button toggle for view switching
    - Server-side redirect for page consolidation
    - searchParams-based view mode
key_files:
  created: []
  modified:
    - src/app/(dashboard)/[teamSlug]/practices/page.tsx
    - src/app/(dashboard)/[teamSlug]/schedule/page.tsx
decisions:
  - "View toggle uses pill button pattern similar to season selector"
  - "Default view is list (maintains existing behavior)"
  - "Schedule page redirects rather than deleted (backward compatibility)"
  - "Max-width adjusts based on view (4xl for list, 6xl for calendar)"
  - "View parameter passed to navigation links for persistence"
metrics:
  duration: "5 minutes"
  completed: 2026-01-27
---

# Phase 22 Plan 10: Practice Page Consolidation Summary

Single unified practices page with calendar/list toggle. Schedule page redirects to practices with calendar view.

## What Was Built

### Task 1: View Toggle on Practices Page

Added view toggle to practices page with searchParams handling:

- **URL Parameter:** `?view=list` (default) or `?view=calendar`
- **Toggle UI:** Pill buttons with List and CalendarDays icons
- **Active State:** Highlighted background for active view
- **Conditional Rendering:**
  - `view=list`: Shows PracticeListClient with selection mode
  - `view=calendar`: Shows UnifiedCalendar with all features
- **Responsive Width:** max-w-4xl for list, max-w-6xl for calendar
- **Link Persistence:** Coach action links include current view parameter

### Task 2: Schedule Page Redirect

Replaced schedule page with server-side redirect:

```typescript
redirect(`/${teamSlug}/practices?view=calendar`);
```

- Preserves existing bookmarks and links to `/schedule`
- No user-visible change (seamless redirect)
- File kept for backward compatibility (not deleted)

## Implementation Details

### View Toggle Component

```tsx
<div className="flex items-center p-1 bg-zinc-800 rounded-lg border border-zinc-700">
  <Link
    href={`/${teamSlug}/practices?view=list`}
    className={cn(
      'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      viewMode === 'list'
        ? 'bg-zinc-700 text-white'
        : 'text-zinc-400 hover:text-zinc-200'
    )}
  >
    <List className="h-4 w-4" />
    <span className="sr-only">List view</span>
  </Link>
  <Link
    href={`/${teamSlug}/practices?view=calendar`}
    className={cn(
      'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      viewMode === 'calendar'
        ? 'bg-zinc-700 text-white'
        : 'text-zinc-400 hover:text-zinc-200'
    )}
  >
    <CalendarDays className="h-4 w-4" />
    <span className="sr-only">Calendar view</span>
  </Link>
</div>
```

Pill button pattern with icon-only display (labels in sr-only for accessibility).

### Preserved Functionality

All existing features work in both views:

| Feature | List View | Calendar View |
|---------|-----------|---------------|
| New Practice button | Yes | Yes |
| Create Multiple button | Yes | Yes |
| Selection mode | Yes | N/A (not applicable) |
| Bulk delete | Yes | N/A (not applicable) |
| Season selector | N/A (filters at data level) | Yes (in calendar) |
| Export | N/A | Yes (in calendar) |
| Offline support | N/A | Yes (in calendar) |

## Commits

| Hash | Description |
|------|-------------|
| 4527ba0 | feat(22-10): add view toggle to practices page |
| 4fae9ca | feat(22-10): redirect schedule page to practices with calendar view |

## Verification

- [x] TypeScript compiles without errors
- [x] Practices page has working view toggle
- [x] Calendar view shows UnifiedCalendar with full functionality
- [x] List view shows PracticeListClient with selection mode
- [x] Schedule page redirects to practices?view=calendar
- [x] All coach actions (New, Bulk, Delete) work in both views

## Deviations from Plan

None - plan executed exactly as written.

## GAP-02 Closure

This plan closes GAP-02 from the verification phase:

**Gap Identified:** `/schedule` and `/practices` do overlapping things with inconsistent UX

**Resolution:**
- Single unified `/practices` page with view toggle
- Calendar view provides full UnifiedCalendar functionality
- List view provides practice management with selection mode
- Schedule page redirects to practices (backward compatible)

Users now have one place to manage practices with flexible viewing options.

## Next Phase Readiness

Phase 22 gap closure complete. All gap closure plans (22-10 through 22-13) should be verified for phase completion.
