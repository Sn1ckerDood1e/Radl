# Phase 23: Dashboard Enhancements - Research

**Researched:** 2026-01-27
**Domain:** Dashboard widgets, role-based views, data aggregation, sparklines
**Confidence:** HIGH

## Summary

This phase enhances the existing team dashboard (`/[teamSlug]/page.tsx`) with role-aware widgets: a priority hero pattern for Today's Schedule, Fleet Health overview (already exists), Equipment Usage trends sparkline, and context-aware Quick Actions. The codebase already has a strong foundation:

1. **Existing dashboard structure** - Server Component with parallel data fetching, role-based rendering (`isCoach`)
2. **Fleet Health widget** - Already implemented in Phase 21 with status aggregation
3. **Equipment usage logging** - `EquipmentUsageLog` model and `getUsageLogsForTeam()` utility exist
4. **Practice data models** - Complete with blocks, lineups, seat assignments for athlete-specific queries
5. **Announcement system** - Widget already renders for both coaches and athletes

The primary work is: (1) restructure dashboard for hero pattern with distinct coach/athlete layouts, (2) add sparkline component for usage trends, (3) add context-aware quick actions widget, (4) enhance practice widget to show athlete-specific assignments.

**Primary recommendation:** Build custom SVG sparkline component (30-50 lines) rather than adding a charting library dependency. Restructure dashboard page into separate `CoachDashboard` and `AthleteDashboard` server components to keep layouts cleanly separated.

## Standard Stack

The codebase uses an established stack that this phase will follow.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 | Server Components for data fetching | Dashboard page is already RSC, parallel queries |
| Prisma | 6.0.0 | Database queries with relations | Existing patterns for practice/equipment/lineup queries |
| date-fns | 4.1.0 | Date manipulation | Season date ranges, "hours ago" formatting |
| lucide-react | 0.562.0 | Icons | Consistent with existing widgets |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | 2.1.1 + 3.4.0 | Conditional styling | Widget card variants, status colors |
| (custom SVG) | - | Sparkline chart | Equipment usage trends visualization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SVG sparkline | react-sparklines (127k/week) | 3.5KB dependency vs ~50 lines custom code; custom gives exact styling control |
| Custom SVG sparkline | recharts (11M/week) | Overkill for single sparkline; recharts is 167KB gzipped |
| Custom SVG sparkline | MUI X Sparkline | Requires MUI dependency chain; codebase doesn't use MUI |

**Installation:**
```bash
# All dependencies already installed
# No new packages required for this phase
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── dashboard-with-onboarding.tsx    # EXISTS: Onboarding wrapper
│   │   ├── coach-dashboard.tsx              # NEW: Coach-specific layout
│   │   ├── athlete-dashboard.tsx            # NEW: Athlete-specific layout
│   │   ├── todays-schedule-widget.tsx       # NEW: Hero widget (coach)
│   │   ├── next-practice-widget.tsx         # NEW: Hero widget (athlete)
│   │   ├── usage-trends-widget.tsx          # NEW: Sparkline widget (coach)
│   │   ├── quick-actions-widget.tsx         # NEW: Context-aware actions (coach)
│   │   └── sparkline.tsx                    # NEW: Reusable SVG sparkline
│   └── equipment/
│       └── fleet-health-widget.tsx          # EXISTS: From Phase 21
├── lib/
│   ├── equipment/
│   │   └── usage-logger.ts                  # EXISTS: getUsageLogsForTeam()
│   └── dashboard/
│       └── aggregations.ts                  # NEW: Usage aggregation helpers
└── app/
    └── (dashboard)/[teamSlug]/
        └── page.tsx                         # MODIFY: Route to coach/athlete dashboards
```

### Pattern 1: Role-Based Dashboard Routing
**What:** Single page.tsx that delegates to role-specific dashboard components
**When to use:** When coach and athlete views are fundamentally different (not just hidden sections)
**Example:**
```typescript
// Source: Existing pattern in src/app/(dashboard)/[teamSlug]/page.tsx
export default async function TeamDashboardPage({ params }: Props) {
  const { teamSlug } = await params;
  const { user, clubId, error } = await getClaimsForApiRoute();
  // ... auth checks and data fetching ...

  const isCoach = userRoles.includes('COACH');

  // Delegate to role-specific component
  if (isCoach) {
    return (
      <DashboardWithOnboarding teamId={team.id} teamName={team.name} isCoach={true}>
        <CoachDashboard
          teamSlug={teamSlug}
          todaysPractices={todaysPractices}
          fleetHealth={fleetHealth}
          usageTrends={usageTrends}
          attentionItems={attentionItems}
        />
      </DashboardWithOnboarding>
    );
  }

  return (
    <AthleteDashboard
      teamSlug={teamSlug}
      nextPractice={nextPractice}
      myAssignment={myAssignment}
      announcements={announcements}
    />
  );
}
```

### Pattern 2: Priority Hero Widget Layout
**What:** Large hero widget at top, smaller widgets in grid below
**When to use:** Dashboard with one primary action/info piece (Today's Schedule)
**Example:**
```typescript
// Source: Context decision for Phase 23
function CoachDashboard({ todaysPractices, fleetHealth, usageTrends, attentionItems }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero: Full-width, prominent */}
      <TodaysScheduleWidget practices={todaysPractices} />

      {/* Secondary: 2-column grid on desktop, stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FleetHealthWidget {...fleetHealth} />
        <UsageTrendsWidget data={usageTrends} />
      </div>

      {/* Quick Actions: Context-aware */}
      <QuickActionsWidget items={attentionItems} />
    </div>
  );
}
```

### Pattern 3: Custom SVG Sparkline
**What:** Minimal React component rendering polyline SVG from data array
**When to use:** Compact trend visualization without axis labels
**Example:**
```typescript
// Source: DEV Community tutorial + SVG best practices
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  strokeColor = 'currentColor',
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  // Generate polyline points: scale data to fit SVG viewport
  // Leave padding for stroke width
  const padding = strokeWidth;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
```

### Pattern 4: Athlete-Specific Practice Query
**What:** Query practice with nested lineup/seats filtered to current athlete
**When to use:** Athlete dashboard showing "Your next practice" with their seat assignment
**Example:**
```typescript
// Source: Existing Prisma patterns in codebase
async function getAthleteNextPractice(teamId: string, userId: string, now: Date) {
  // First get athlete profile ID
  const teamMember = await prisma.teamMember.findFirst({
    where: { teamId, userId },
    include: { athleteProfile: { select: { id: true } } },
  });

  if (!teamMember?.athleteProfile) return null;
  const athleteId = teamMember.athleteProfile.id;

  // Find next practice where athlete has an assignment
  const nextPractice = await prisma.practice.findFirst({
    where: {
      teamId,
      date: { gte: now },
      status: 'PUBLISHED',
      // Has at least one block with this athlete assigned
      blocks: {
        some: {
          OR: [
            // Water block with seat assignment
            { lineup: { some: { seats: { some: { athleteId } } } } },
            // Land/erg block with land assignment
            { landAssignments: { some: { athleteId } } },
          ],
        },
      },
    },
    orderBy: { date: 'asc' },
    include: {
      blocks: {
        where: {
          OR: [
            { lineup: { some: { seats: { some: { athleteId } } } } },
            { landAssignments: { some: { athleteId } } },
          ],
        },
        include: {
          lineup: {
            include: {
              boat: { select: { name: true, boatClass: true } },
              seats: {
                where: { athleteId },
                select: { position: true, side: true },
              },
            },
          },
          landAssignments: {
            where: { athleteId },
          },
        },
      },
    },
  });

  return nextPractice;
}
```

### Pattern 5: Context-Aware Quick Actions
**What:** Dynamic action buttons based on pending items requiring attention
**When to use:** Coach dashboard to surface actionable tasks
**Example:**
```typescript
// Source: Context decision for Phase 23
interface AttentionItem {
  type: 'equipment_inspection' | 'lineup_needed' | 'practice_unpublished';
  count: number;
  label: string;
  href: string;
}

async function getAttentionItems(teamId: string): Promise<AttentionItem[]> {
  const now = new Date();
  const [equipmentNeedingInspection, practicesNeedingLineup] = await Promise.all([
    // Equipment past inspection threshold
    prisma.equipment.count({
      where: {
        teamId,
        status: 'ACTIVE',
        OR: [
          { lastInspectedAt: null },
          // Would need to compute threshold - simplified here
        ],
      },
    }),
    // Upcoming practices without lineups in water blocks
    prisma.practice.count({
      where: {
        teamId,
        date: { gte: now },
        status: { in: ['DRAFT', 'PUBLISHED'] },
        blocks: {
          some: {
            type: 'WATER',
            lineup: { none: {} },
          },
        },
      },
    }),
  ]);

  const items: AttentionItem[] = [];

  if (equipmentNeedingInspection > 0) {
    items.push({
      type: 'equipment_inspection',
      count: equipmentNeedingInspection,
      label: `${equipmentNeedingInspection} boat${equipmentNeedingInspection !== 1 ? 's' : ''} need inspection`,
      href: `/${teamSlug}/equipment`,
    });
  }

  if (practicesNeedingLineup > 0) {
    items.push({
      type: 'lineup_needed',
      count: practicesNeedingLineup,
      label: `${practicesNeedingLineup} practice${practicesNeedingLineup !== 1 ? 's' : ''} need lineups`,
      href: `/${teamSlug}/practices`,
    });
  }

  return items;
}
```

### Pattern 6: Usage Aggregation for Sparkline
**What:** Aggregate equipment usage logs into weekly buckets for trend display
**When to use:** Equipment usage trends sparkline (hours per week)
**Example:**
```typescript
// Source: Existing getUsageLogsForTeam() + date-fns aggregation
import { startOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';

interface WeeklyUsage {
  weekStart: Date;
  totalMinutes: number;
}

export function aggregateUsageByWeek(
  usageLogs: Array<{ usageDate: Date; practice: { startTime: Date; endTime: Date } }>,
  seasonStart: Date,
  seasonEnd: Date
): WeeklyUsage[] {
  // Generate all weeks in season
  const weeks = eachWeekOfInterval({ start: seasonStart, end: seasonEnd });

  return weeks.map(weekStart => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Sum practice durations for this week
    const totalMinutes = usageLogs
      .filter(log => isWithinInterval(log.usageDate, { start: weekStart, end: weekEnd }))
      .reduce((sum, log) => {
        const duration = (log.practice.endTime.getTime() - log.practice.startTime.getTime()) / 60000;
        return sum + duration;
      }, 0);

    return { weekStart, totalMinutes };
  });
}

// Convert to sparkline data (just the values)
export function usageToSparklineData(weekly: WeeklyUsage[]): number[] {
  return weekly.map(w => w.totalMinutes);
}
```

### Anti-Patterns to Avoid
- **Don't mix coach/athlete logic in same component** - Separate components are cleaner than conditional rendering everywhere
- **Don't fetch all data upfront** - Only fetch what each role needs (athlete doesn't need fleet health)
- **Don't use charting library for single sparkline** - Custom SVG is 50 lines vs 150KB+ dependency
- **Don't compute trends client-side** - Aggregate in server component to avoid sending raw logs
- **Don't show empty widgets** - If no data, show helpful empty state with action (e.g., "No practices today")

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic | Manual timestamp math | date-fns (startOfWeek, eachWeekOfInterval) | Handles week boundaries, timezones, edge cases |
| Fleet health aggregation | New calculation | aggregateFleetHealth() from readiness.ts | Already implemented in Phase 21 |
| Equipment usage logs | Custom query | getUsageLogsForTeam() from usage-logger.ts | Already handles date filtering, includes practice details |
| Auth/role checking | Custom JWT parsing | getClaimsForApiRoute() | Existing pattern, handles cookie fallback |
| Widget card styling | Inline styles | Existing widget patterns (FleetHealthWidget, AnnouncementList) | Consistent surface-1, border-subtle patterns |

**Key insight:** Phase 21 and 22 built most of the infrastructure. This phase is primarily UI restructuring and data aggregation. The only truly new component is the sparkline.

## Common Pitfalls

### Pitfall 1: Timezone Issues in "Today's Practices"
**What goes wrong:** Practice shows as "today" when viewed in different timezone than server
**Why it happens:** Server uses UTC, but "today" is user-relative
**How to avoid:**
- Pass team's timezone (from Facility or TeamSettings) to comparison logic
- Use date-fns-tz for timezone-aware date comparisons
- Or simpler: compare by date string only, not full datetime
**Warning signs:** Practice appears/disappears around midnight, wrong practices shown for international teams

**Solution pattern:**
```typescript
// Compare by date string, ignoring time
const today = new Date().toISOString().split('T')[0]; // "2026-01-27"
const practiceDate = practice.date.toISOString().split('T')[0];
const isToday = today === practiceDate;
```

### Pitfall 2: N+1 Queries in Athlete Assignment Lookup
**What goes wrong:** Dashboard is slow because each practice queries separately for athlete's seat
**Why it happens:** Fetching practices then looping to find athlete's assignment
**How to avoid:**
- Use single query with Prisma relation filters (see Pattern 4)
- Filter in database, not in JavaScript
- Include only needed relations
**Warning signs:** Dashboard load time scales with number of practices

### Pitfall 3: Empty Sparkline Crash
**What goes wrong:** Component crashes or renders broken SVG when data array is empty or has 1 point
**Why it happens:** Polyline needs at least 2 points; division by zero with 0-length array
**How to avoid:**
- Guard: `if (data.length < 2) return null;`
- Or show placeholder: "Not enough data" message
- Handle range = 0 (all same values): `const range = max - min || 1;`
**Warning signs:** Console errors about NaN, blank widget area, broken layout

### Pitfall 4: Hero Widget Mobile Overflow
**What goes wrong:** Today's Schedule widget with many practices overflows on mobile
**Why it happens:** Fixed height or no scroll container
**How to avoid:**
- Use max-height with overflow-y-auto for practice list
- Limit visible items (e.g., first 5) with "Show all" link
- Consider collapsible sections on mobile
**Warning signs:** Content bleeds outside widget bounds, horizontal scroll appears

### Pitfall 5: Context-Aware Actions Shows Stale Counts
**What goes wrong:** "3 boats need inspection" still shows after coach marks them inspected
**Why it happens:** Page cached or not revalidated after action
**How to avoid:**
- Quick actions should link to detail pages where action happens
- Use router.refresh() after mutations in linked pages
- Consider client-side polling for time-sensitive counts (but avoid for MVP)
**Warning signs:** Counts don't decrease after taking action

### Pitfall 6: Athlete Sees No Practice When Not Yet Assigned
**What goes wrong:** Athlete has upcoming practice but it doesn't show because no lineup assigned yet
**Why it happens:** Query filters to only practices with their assignment
**How to avoid:**
- Two-tier display: (1) practices with your assignment shown first, (2) then "other upcoming practices" below
- Or show all published practices, highlight ones with assignment
- Empty state: "You haven't been assigned to any upcoming practices yet"
**Warning signs:** Athlete sees "No upcoming practices" when coach just hasn't done lineups yet

## Code Examples

Verified patterns from codebase:

### Parallel Data Fetching (Existing Pattern)
```typescript
// Source: src/app/(dashboard)/[teamSlug]/page.tsx
const [team, openDamageReportCount, announcementsRaw, upcomingPractices, equipment] = await Promise.all([
  prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, slug: true },
  }),
  prisma.damageReport.count({
    where: { teamId, status: 'OPEN' },
  }),
  prisma.announcement.findMany({
    where: announcementsWhere,
    include: { readReceipts: { where: { userId: user.id } } },
  }),
  prisma.practice.findMany({
    where: { teamId, date: { gte: now } },
    orderBy: { date: 'asc' },
    take: 5,
    select: { id: true, name: true, date: true, startTime: true, endTime: true },
  }),
  prisma.equipment.findMany({
    where: { teamId, status: 'ACTIVE' },
    include: { damageReports: { where: { status: 'OPEN' } } },
  }),
]);
```

### Widget Card Structure (Existing Pattern)
```typescript
// Source: src/components/equipment/fleet-health-widget.tsx
<div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
  <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Widget Title</h2>
    <Link
      href={`/${teamSlug}/destination`}
      className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
    >
      View all
    </Link>
  </div>
  <div className="p-4">
    {/* Widget content */}
  </div>
</div>
```

### Empty State Pattern (Existing)
```typescript
// Source: src/components/ui/empty-state.tsx
<EmptyState
  icon={Calendar}
  title="No practices today"
  description="Enjoy your rest day, or create a practice for the team."
  action={isCoach ? { label: "New Practice", href: `/${teamSlug}/practices/new` } : undefined}
/>
```

### Today's Practices Query
```typescript
// NEW: Query for today's practices with athlete counts
const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const todayEnd = new Date(todayStart);
todayEnd.setDate(todayEnd.getDate() + 1);

const todaysPractices = await prisma.practice.findMany({
  where: {
    teamId,
    date: { gte: todayStart, lt: todayEnd },
    status: 'PUBLISHED',
  },
  orderBy: { startTime: 'asc' },
  include: {
    blocks: {
      include: {
        lineup: {
          include: {
            seats: { select: { id: true } },  // Just count
          },
        },
        landAssignments: { select: { id: true } },  // Just count
      },
    },
  },
});

// Compute athlete count per practice
const practicesWithCounts = todaysPractices.map(p => ({
  ...p,
  athleteCount: p.blocks.reduce((sum, block) => {
    const waterSeats = block.lineup?.reduce((s, l) => s + l.seats.length, 0) ?? 0;
    const landAthletes = block.landAssignments.length;
    return sum + Math.max(waterSeats, landAthletes);  // Avoid double-counting
  }, 0),
}));
```

### Usage Trends Query
```typescript
// NEW: Get usage data for sparkline
import { getUsageLogsForTeam } from '@/lib/equipment/usage-logger';
import { startOfMonth, subMonths } from 'date-fns';

// Get current season's date range, or default to last 3 months
const activeSeason = await prisma.season.findFirst({
  where: { teamId, status: 'ACTIVE' },
  orderBy: { startDate: 'desc' },
});

const seasonStart = activeSeason?.startDate ?? subMonths(new Date(), 3);
const seasonEnd = activeSeason?.endDate ?? new Date();

const usageLogs = await getUsageLogsForTeam(teamId, {
  startDate: seasonStart,
  endDate: seasonEnd,
});

// Aggregate by week
const weeklyUsage = aggregateUsageByWeek(usageLogs, seasonStart, seasonEnd);
const sparklineData = weeklyUsage.map(w => w.totalMinutes);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single dashboard for all roles | Role-specific dashboard components | 2024-2025 | Cleaner code, tailored UX per role |
| recharts/Chart.js for sparklines | Custom SVG polyline | 2024+ | Eliminates heavy dependency for simple viz |
| Static quick action buttons | Context-aware actions based on data | 2024+ | Reduces cognitive load, surfaces urgent items |
| List of upcoming practices | Hero "Today's Schedule" + secondary | Context decision | Prioritizes immediate actionability |

**Deprecated/outdated:**
- Using `<canvas>` for sparklines - SVG is better for crisp rendering at any size
- Fetching all data regardless of role - Wasteful, slower, potential security issue

## Open Questions

Things that couldn't be fully resolved:

1. **Season date range for sparkline**
   - What we know: Usage trends should show "current season"
   - What's unclear: What if no active season? What if season spans calendar year?
   - Recommendation: Fallback to "last 3 months" if no active season. Season can span year boundary.

2. **Mobile widget collapse behavior**
   - What we know: Context says "Claude's discretion based on content density"
   - What's unclear: Should widgets be collapsible accordions, or just stacked?
   - Recommendation: Stack on mobile (no accordion). Simpler UX, content is already concise.

3. **Countdown format for "next practice"**
   - What we know: If no practices today, show next with countdown
   - What's unclear: "2 days, 3 hours" vs "Friday at 6am" vs "in 51 hours"
   - Recommendation: Use relative day + time: "Friday at 6:00 AM (in 2 days)"

4. **Lineups needed detection**
   - What we know: Show "X practices need lineups" in quick actions
   - What's unclear: Only water blocks? Include erg blocks? How far in advance?
   - Recommendation: Only water blocks (they have boats). Next 14 days. Coaches most care about upcoming water lineups.

## Sources

### Primary (HIGH confidence)
- Existing dashboard: `/home/hb/radl/src/app/(dashboard)/[teamSlug]/page.tsx` - Current structure, parallel queries
- Fleet health widget: `/home/hb/radl/src/components/equipment/fleet-health-widget.tsx` - Widget card pattern
- Usage logger: `/home/hb/radl/src/lib/equipment/usage-logger.ts` - getUsageLogsForTeam()
- Readiness utilities: `/home/hb/radl/src/lib/equipment/readiness.ts` - aggregateFleetHealth()
- Practice schema: `/home/hb/radl/prisma/schema.prisma` - Practice, Block, Lineup, SeatAssignment models

### Secondary (MEDIUM confidence)
- Phase 23 Context: `/home/hb/radl/.planning/phases/23-dashboard-enhancements/23-CONTEXT.md` - User decisions
- Custom sparkline tutorial: https://dev.to/gnykka/how-to-create-a-sparkline-component-in-react-4e1

### Tertiary (LOW confidence - WebSearch only)
- react-sparklines npm stats: https://npmtrends.com/react-sparkline-vs-react-sparklines-vs-recharts-vs-sparkline - Verified download counts
- Dashboard patterns: General best practices, not codebase-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, patterns in active use
- Architecture patterns: HIGH - Builds on existing dashboard structure, widget patterns proven
- Sparkline: HIGH - SVG polyline is well-documented, simple implementation
- Athlete query: MEDIUM - Pattern inferred from schema, needs validation with actual data
- Usage aggregation: MEDIUM - date-fns functions verified, but aggregation logic not yet tested

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable domain, builds on existing Phase 21/22 work)
