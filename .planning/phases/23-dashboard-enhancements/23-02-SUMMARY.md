---
phase: 23-dashboard-enhancements
plan: 02
subsystem: dashboard
tags: [widgets, schedule, quick-actions, coach-dashboard]

dependencies:
  requires: []
  provides: [TodaysScheduleWidget, QuickActionsWidget]
  affects: [23-03, 23-04]

tech-stack:
  added: []
  patterns: [widget-card-structure, attention-item-pattern]

key-files:
  created:
    - src/components/dashboard/todays-schedule-widget.tsx
    - src/components/dashboard/quick-actions-widget.tsx
  modified: []

decisions:
  - key: time-format
    choice: "12-hour format with AM/PM using toLocaleTimeString"
    reason: "Matches US rowing conventions, consistent with existing practice display"
  - key: relative-date-display
    choice: "Today, Tomorrow, weekday name (<=6 days), or date format"
    reason: "Intuitive countdown for near-term practices"
  - key: block-count-display
    choice: "Only show when blockCount > 0"
    reason: "Avoid clutter for practices without blocks configured"
  - key: attention-item-types
    choice: "Three types: equipment_inspection, lineup_needed, practice_unpublished"
    reason: "Covers main coach action items, extensible for future types"

metrics:
  duration: "4m"
  completed: 2026-01-27
---

# Phase 23 Plan 02: Coach Dashboard Widgets Summary

**One-liner:** Two display widgets for coach dashboard - Today's Schedule hero and Quick Actions attention panel.

## What Was Built

### TodaysScheduleWidget
A hero widget displaying today's practices with complete schedule information:
- Time range display (e.g., "6:00 AM - 8:00 AM")
- Practice name with athlete count badge
- Block count indicator when blocks exist
- Fallback to "next practice" card when no practices today
- Empty state with create practice link when no upcoming practices
- Links to practice detail page on click

### QuickActionsWidget
Context-aware attention items widget:
- Type-based icon styling:
  - equipment_inspection: Amber AlertTriangle
  - lineup_needed: Blue Users
  - practice_unpublished: Purple FileEdit
- Direct links to relevant pages with chevron indicator
- "All caught up" success state with emerald checkmark when no items

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Time format | 12-hour with AM/PM | Matches US rowing convention |
| Relative dates | Today/Tomorrow/weekday/date | Intuitive near-term countdown |
| Block count | Show only when > 0 | Avoid clutter for unconfigured practices |
| Item types | 3 predefined types | Covers main coach actions, extensible |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 69c3f16 | feat | Create TodaysScheduleWidget component |
| 70dbec0 | feat | Create QuickActionsWidget component |

## Files Changed

**Created:**
- `src/components/dashboard/todays-schedule-widget.tsx` (192 lines) - Today's schedule hero widget
- `src/components/dashboard/quick-actions-widget.tsx` (107 lines) - Quick actions attention widget

## Verification Results

- [x] Both components exist and export correctly
- [x] TypeScript compilation succeeds
- [x] TodaysScheduleWidget handles: multiple practices, single practice, no practices with fallback, no practices at all
- [x] QuickActionsWidget handles: multiple items, single item, no items (success state)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 23-03 (CoachDashboard composition). Both widgets are:
- Exported and ready for import
- Typed with clear prop interfaces
- Following consistent widget card styling pattern

## Usage Example

```tsx
import { TodaysScheduleWidget } from '@/components/dashboard/todays-schedule-widget';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';

// In CoachDashboard
<TodaysScheduleWidget
  teamSlug={teamSlug}
  practices={todaysPractices}
  nextPractice={nextPractice}
/>

<QuickActionsWidget
  teamSlug={teamSlug}
  items={[
    { type: 'equipment_inspection', count: 3, label: '3 boats need inspection', href: `/${teamSlug}/equipment` },
    { type: 'lineup_needed', count: 2, label: '2 practices need lineups', href: `/${teamSlug}/practices` },
  ]}
/>
```
