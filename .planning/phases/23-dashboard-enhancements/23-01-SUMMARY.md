---
phase: 23
plan: 01
subsystem: dashboard
tags: [sparkline, svg, aggregation, date-fns, visualization]
requires:
  - "Phase 21 equipment readiness (FleetHealthWidget exists)"
  - "Phase 22 practice flow (Practice model with startTime/endTime)"
provides:
  - "Reusable Sparkline SVG component"
  - "Weekly usage aggregation utilities"
affects:
  - "23-02: UsageTrendsWidget will use Sparkline"
  - "23-03: Dashboard restructure will use aggregations"
tech-stack:
  added: []
  patterns:
    - "Custom SVG polyline for lightweight visualization"
    - "date-fns interval functions for week bucketing"
key-files:
  created:
    - "src/components/dashboard/sparkline.tsx"
    - "src/lib/dashboard/aggregations.ts"
  modified: []
decisions:
  - id: sparkline-custom-svg
    choice: "Custom 100-line SVG component over react-sparklines or recharts"
    rationale: "Avoid 150KB+ dependency for simple polyline; exact styling control"
  - id: week-aggregation-date-fns
    choice: "Use eachWeekOfInterval and isWithinInterval from date-fns"
    rationale: "Already installed, handles week boundaries and edge cases correctly"
  - id: duration-from-practice-times
    choice: "Compute duration from practice.startTime/endTime"
    rationale: "Practice model has these fields; no stored duration field exists"
metrics:
  duration: "~2 minutes"
  completed: "2026-01-27"
---

# Phase 23 Plan 01: Sparkline and Aggregations Summary

**One-liner:** Custom SVG sparkline component and date-fns week aggregation utilities for equipment usage trend visualization.

## What Was Built

### Sparkline Component (`src/components/dashboard/sparkline.tsx`)

A minimal SVG sparkline component for compact trend visualization:

- **Props:** `data` (number[]), `width` (120), `height` (32), `strokeColor` ('currentColor'), `strokeWidth` (1.5), `className`
- **Edge cases:** Returns null for < 2 points; handles flat line (all same values) with `range || 1`
- **Accessibility:** `aria-hidden="true"` for decorative visualization
- **Styling:** `strokeLinecap="round"` and `strokeLinejoin="round"` for smooth appearance

### Aggregation Utilities (`src/lib/dashboard/aggregations.ts`)

Two functions for converting usage logs to sparkline-ready data:

1. **`aggregateUsageByWeek(usageLogs, seasonStart, seasonEnd)`**
   - Generates all weeks in date range via `eachWeekOfInterval`
   - Sums practice durations (endTime - startTime in minutes) per week
   - Uses `isWithinInterval` for accurate week boundary detection
   - Returns `WeeklyUsage[]` with weekStart and totalMinutes

2. **`usageToSparklineData(weeklyUsage)`**
   - Extracts just the totalMinutes values as number[]
   - Ready to pass directly to Sparkline component

## Key Implementation Details

### Sparkline Points Calculation

```typescript
const points = data
  .map((value, index) => {
    const x = padding + (index / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
    return `${x},${y}`;
  })
  .join(' ');
```

- Scales data to fit SVG viewport with padding for stroke
- Inverts y-axis (SVG y=0 is top, we want higher values at top)

### Week Aggregation Logic

```typescript
const weeks = eachWeekOfInterval({ start: seasonStart, end: seasonEnd });
return weeks.map((weekStart) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const totalMinutes = usageLogs
    .filter((log) => isWithinInterval(new Date(log.usageDate), { start: weekStart, end: weekEnd }))
    .reduce((sum, log) => {
      const durationMs = new Date(log.practice.endTime).getTime() - new Date(log.practice.startTime).getTime();
      return sum + Math.max(0, durationMs / 60000);
    }, 0);
  return { weekStart, totalMinutes: Math.round(totalMinutes) };
});
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASS (`npx tsc --noEmit`)
- Both files exist with proper exports
- Edge cases handled:
  - Sparkline: empty array returns null, single value returns null, flat line uses range=1
  - Aggregation: empty logs returns empty weeks, invalid date range returns empty array

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| src/components/dashboard/sparkline.tsx | Created | 100 |
| src/lib/dashboard/aggregations.ts | Created | 117 |

## Next Phase Readiness

Ready for 23-02 (UsageTrendsWidget):
- Sparkline component exported and typed
- aggregateUsageByWeek compatible with getUsageLogsForTeam output
- usageToSparklineData bridges aggregation to Sparkline props

## Commits

| Hash | Message |
|------|---------|
| 02259c7 | feat(23-01): add Sparkline component for trend visualization |
| a0fecad | feat(23-01): add usage aggregation utilities for sparkline data |
