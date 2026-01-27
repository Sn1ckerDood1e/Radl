---
phase: 23-dashboard-enhancements
plan: 03
subsystem: dashboard
tags: [athlete-dashboard, sparkline, usage-trends, widgets]
completed: 2026-01-27

dependency_graph:
  requires: [23-01]
  provides: [NextPracticeWidget, UsageTrendsWidget]
  affects: [23-04, 23-05]

tech_stack:
  added: []
  patterns:
    - Hero widget with accent bar header
    - Relative date formatting with countdown
    - Assignment display per block type

key_files:
  created:
    - src/components/dashboard/next-practice-widget.tsx
    - src/components/dashboard/usage-trends-widget.tsx
  modified: []

decisions:
  - id: next-practice-hero-layout
    choice: Emerald accent bar header with large countdown display
    rationale: Makes next practice time immediately visible as hero element
  - id: assignment-formatting
    choice: Block-type-specific formatting (boat/seat vs group)
    rationale: Different block types have different assignment meanings
  - id: sparkline-data-threshold
    choice: Require >= 2 data points for sparkline display
    rationale: Single point or empty data cannot show meaningful trend

metrics:
  duration: 3 minutes
  tasks_completed: 2
  tasks_total: 2
---

# Phase 23 Plan 03: Athlete and Usage Widgets Summary

Athlete hero widget with assignment display and equipment usage sparkline widget.

## One-Liner

NextPracticeWidget shows athlete's boat/seat assignment with countdown; UsageTrendsWidget displays total hours with weekly sparkline.

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Create NextPracticeWidget for athletes | ab83a8c | Hero widget with 4 display states, assignment formatting by block type |
| 2 | Create UsageTrendsWidget with sparkline | 374b9c7 | Total hours display with weekly trend sparkline |

## What Changed

### NextPracticeWidget (`src/components/dashboard/next-practice-widget.tsx`)

Athlete hero widget showing their next practice and assignment:

- **Four display states:**
  1. Practice with assignment - Full details with boat/seat or group
  2. Practice without assignment - Shows "Assignment pending"
  3. No practice but unassigned count > 0 - Shows count with coach prompt
  4. No practice at all - Friendly "Enjoy your time off!" message

- **Relative date formatting:**
  - "Today at 6:00 AM"
  - "Tomorrow at 6:00 AM"
  - "Friday at 6:00 AM (in 2 days)"
  - "Jan 15 at 6:00 AM" (beyond 7 days)

- **Block-type-specific assignments:**
  - WATER: "Boat Name - Seat 3 (Port)" or "Boat Name - Coxswain"
  - ERG: "Erg Group: Group A" or "Erg Session"
  - LAND: "Land Training: Group B" or "Land Training"
  - MEETING: "Team Meeting"

### UsageTrendsWidget (`src/components/dashboard/usage-trends-widget.tsx`)

Equipment usage trends widget for coach dashboard:

- **Main display:**
  - Large total hours with clock icon
  - Season name context when provided
  - Sparkline showing weekly trend

- **Edge case handling:**
  - < 2 data points: Shows "Not enough data" placeholder
  - Zero hours: Shows "No equipment usage logged yet"
  - Format helper: 0.5 hours (< 1), 42 hours (1-99), 156 hours (100+)

- **Sparkline integration:**
  - 100px wide x 40px tall
  - Emerald-400 stroke color
  - 2px stroke width for visibility

## Code Examples

### Using NextPracticeWidget

```tsx
<NextPracticeWidget
  teamSlug={teamSlug}
  practice={{
    id: 'practice-123',
    name: 'Morning Row',
    date: new Date('2026-01-28'),
    startTime: new Date('2026-01-28T06:00:00'),
    endTime: new Date('2026-01-28T08:00:00'),
  }}
  assignment={{
    blockType: 'WATER',
    boatName: 'Resolute',
    boatClass: 'EIGHT',
    seatPosition: 3,
    seatSide: 'PORT',
  }}
/>
```

### Using UsageTrendsWidget

```tsx
<UsageTrendsWidget
  teamSlug={teamSlug}
  sparklineData={[120, 90, 150, 180, 140, 200]} // Weekly minutes
  totalHours={42}
  seasonName="Spring 2026"
/>
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: Passed (`npx tsc --noEmit`)
- NextPracticeWidget handles all 4 states correctly
- UsageTrendsWidget handles edge cases (< 2 points, zero hours)
- Both components export correctly with proper TypeScript types

## Next Phase Readiness

Plan 04 and 05 can now proceed with both athlete and coach widgets available:

- **NextPracticeWidget** - Ready for AthleteDashboard composition
- **UsageTrendsWidget** - Ready for CoachDashboard composition
- **Sparkline** - Available from Plan 01 for any trend visualization

No blockers identified for Plan 04 (CoachDashboard) or Plan 05 (AthleteDashboard).
