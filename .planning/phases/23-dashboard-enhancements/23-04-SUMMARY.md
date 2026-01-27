---
phase: 23-dashboard-enhancements
plan: 04
subsystem: dashboard
tags: [coach-dashboard, athlete-dashboard, layout-components, widget-composition]
completed: 2026-01-27

dependency_graph:
  requires: [23-01, 23-02, 23-03]
  provides: [CoachDashboard, AthleteDashboard]
  affects: [23-05, 23-06]

tech_stack:
  added: []
  patterns:
    - Priority hero layout pattern
    - Responsive grid for secondary widgets
    - Focused layout for athletes (narrower max-width)
    - Server components with pre-fetched props

key_files:
  created:
    - src/components/dashboard/coach-dashboard.tsx
    - src/components/dashboard/athlete-dashboard.tsx
  modified: []

decisions:
  - id: coach-layout-priority
    choice: Schedule hero -> Fleet + Usage grid -> Quick Actions -> Announcements
    rationale: Priority hero pattern puts most important info (schedule) first
  - id: athlete-layout-simplicity
    choice: Only NextPractice + Announcements, narrower max-width
    rationale: Athletes need focused "where do I need to be" view, not analytics
  - id: responsive-secondary-grid
    choice: grid-cols-1 md:grid-cols-2 for Fleet + Usage
    rationale: Stack on mobile, side-by-side on desktop for optimal space usage
  - id: announcement-visibility
    choice: Show announcements only if they exist for athletes
    rationale: Empty announcement section would waste space on focused layout

metrics:
  duration: 2 minutes
  tasks_completed: 2
  tasks_total: 2
---

# Phase 23 Plan 04: Dashboard Layout Components Summary

Role-specific dashboard layouts composing widgets in appropriate patterns.

## One-Liner

CoachDashboard composes 5 widgets in priority hero pattern; AthleteDashboard provides focused view with NextPractice hero + optional announcements.

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Create CoachDashboard component | b3bd12b | Priority hero layout with Schedule, Fleet/Usage grid, Quick Actions, Announcements |
| 2 | Create AthleteDashboard component | d94fd98 | Focused layout with NextPractice hero, conditional Announcements |

## What Changed

### CoachDashboard (`src/components/dashboard/coach-dashboard.tsx`)

Coach-specific dashboard layout implementing priority hero pattern:

- **Alert Banner** - Red warning when open damage reports exist
- **Hero Section** - TodaysScheduleWidget (full width, prominent)
- **Secondary Grid** - FleetHealthWidget + UsageTrendsWidget (2-col on desktop, stack on mobile)
- **Quick Actions** - QuickActionsWidget with attention items
- **Announcements** - AnnouncementList with coach management links

**Props Structure:**
```typescript
interface CoachDashboardProps {
  teamSlug: string;
  // Schedule
  todaysPractices: Array<Practice>;
  nextPractice: NextPractice | null;
  // Fleet Health
  statusCounts: Record<ReadinessStatus, number>;
  totalEquipment: number;
  // Usage Trends
  sparklineData: number[];
  totalUsageHours: number;
  seasonName?: string;
  // Quick Actions
  attentionItems: Array<AttentionItem>;
  // Announcements
  announcements: Array<Announcement>;
  // Damage reports
  openDamageReportCount: number;
}
```

### AthleteDashboard (`src/components/dashboard/athlete-dashboard.tsx`)

Athlete-specific dashboard layout - simple, focused:

- **Hero Section** - NextPracticeWidget (full width, their primary info)
- **Announcements** - Only rendered if announcements exist

**Key Design Choices:**
- No fleet health (athletes don't manage equipment)
- No usage trends (coach analytics)
- No quick actions (coach responsibilities)
- Narrower layout: `max-w-3xl` vs coach's `max-w-5xl`

**Props Structure:**
```typescript
interface AthleteDashboardProps {
  teamSlug: string;
  nextPractice: Practice | null;
  assignment: Assignment | null;
  unassignedPracticeCount: number;
  announcements: Array<Announcement>;
}
```

## Code Examples

### Using CoachDashboard

```tsx
<CoachDashboard
  teamSlug="lookout-rowing"
  todaysPractices={todaysPractices}
  nextPractice={nextPractice}
  statusCounts={{ READY: 8, INSPECT_SOON: 2, NEEDS_ATTENTION: 1, OUT_OF_SERVICE: 0 }}
  totalEquipment={11}
  sparklineData={[120, 90, 150, 180, 140, 200]}
  totalUsageHours={42}
  seasonName="Spring 2026"
  attentionItems={[
    { type: 'equipment_inspection', count: 2, label: '2 boats need inspection', href: '/equipment' }
  ]}
  announcements={announcements}
  openDamageReportCount={1}
/>
```

### Using AthleteDashboard

```tsx
<AthleteDashboard
  teamSlug="lookout-rowing"
  nextPractice={{
    id: 'p-123',
    name: 'Morning Row',
    date: new Date(),
    startTime: new Date('2026-01-28T06:00:00'),
    endTime: new Date('2026-01-28T08:00:00'),
  }}
  assignment={{
    blockType: 'WATER',
    boatName: 'Resolute',
    seatPosition: 3,
    seatSide: 'PORT',
  }}
  unassignedPracticeCount={0}
  announcements={announcements}
/>
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: Passed (`npx tsc --noEmit`)
- Both components export correctly (CoachDashboard, AthleteDashboard)
- CoachDashboard imports all required widgets (TodaysSchedule, FleetHealth, UsageTrends, QuickActions)
- AthleteDashboard imports NextPractice + AnnouncementList
- Responsive layout verified (grid-cols-1 md:grid-cols-2)

## Next Phase Readiness

Plan 05 (page-level routing) can now proceed:

- **CoachDashboard** - Ready for coach role routing
- **AthleteDashboard** - Ready for athlete role routing
- All widget dependencies satisfied from Plans 01-03

No blockers identified for Plan 05 (role-based page routing).
