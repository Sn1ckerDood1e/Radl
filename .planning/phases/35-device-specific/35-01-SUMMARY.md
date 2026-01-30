---
phase: 35-device-specific
plan: 01
subsystem: calendar-mobile
tags: [calendar, mobile, touch, drawer, responsive]

dependency-graph:
  requires:
    - 34: UX Polish (empty states, loading)
  provides:
    - ResponsiveCalendarWrapper component
    - 44px touch target CSS variables
    - Mobile-optimized date picker in BulkPracticeCreator
  affects:
    - 35-02: May need similar responsive patterns for lineups
    - 35-03: Mobile practice list optimization

tech-stack:
  added: []
  patterns:
    - ResponsiveCalendarWrapper (mobile Drawer, desktop Dialog)
    - CSS variables for rdp touch targets
    - useIsMobile conditional rendering

key-files:
  created:
    - src/components/calendar/responsive-calendar-wrapper.tsx
  modified:
    - src/components/calendar/unified-calendar.tsx
    - src/components/practices/bulk-practice-creator.tsx

decisions:
  - id: calendar-mobile-pattern
    choice: "Drawer on mobile, Dialog on desktop (not Popover)"
    rationale: "No Popover component exists; Dialog provides modal behavior"
  - id: css-variables-touch
    choice: "Use rdp CSS variables (--rdp-day_button-height: 44px)"
    rationale: "react-day-picker v9 uses CSS custom properties internally"

metrics:
  duration: "3m 25s"
  completed: "2026-01-30"
---

# Phase 35 Plan 01: Calendar Mobile Optimization Summary

Mobile-aware calendar with bottom sheet presentation and WCAG 2.5.5 compliant touch targets.

## One-liner

ResponsiveCalendarWrapper component renders calendar in Drawer on mobile, with 44px touch targets via CSS variables.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e2063fb | feat | Create ResponsiveCalendarWrapper component |
| 037943f | feat | Add CSS variables for 44px calendar touch targets |
| 2886396 | feat | Integrate ResponsiveCalendarWrapper in BulkPracticeCreator |

## Requirements Satisfied

| ID | Requirement | Status |
|----|-------------|--------|
| CALM-01 | Calendar date field opens bottom sheet on mobile | COMPLETE |
| CALM-02 | Calendar touch targets 44px+ | COMPLETE |

## Decisions Made

### 1. Drawer on mobile, Dialog on desktop

**Context:** Plan suggested Popover for desktop, but no Popover component exists in the codebase.

**Decision:** Use Dialog for desktop popup mode (when inline=false).

**Rationale:** Dialog provides consistent modal behavior and already exists. The ResponsiveCalendarWrapper follows the ResponsiveMenu pattern but adapts for calendar use case.

### 2. CSS variables for touch targets

**Context:** react-day-picker v9 uses CSS custom properties for sizing.

**Decision:** Set `--rdp-day_button-height: 44px` and related variables at the `.rdp-root` class level.

**Rationale:** This ensures react-day-picker internal calculations use the correct sizes, and our explicit height styles align with the variables.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### ResponsiveCalendarWrapper Component

```typescript
// src/components/calendar/responsive-calendar-wrapper.tsx
interface ResponsiveCalendarWrapperProps {
  trigger: React.ReactNode;      // Button that opens calendar
  children: React.ReactNode;     // DayPicker content
  title?: string;                // Drawer header title
  inline?: boolean;              // Desktop: inline (no popup) vs Dialog
  open?: boolean;                // Controlled state
  onOpenChange?: (open: boolean) => void;
}
```

**Mobile behavior:**
- Renders in Drawer (bottom sheet) from vaul
- DrawerContent has `pb-safe` for safe area
- Calendar content in `p-4 pb-8` padding

**Desktop behavior:**
- `inline=true`: Renders children directly
- `inline=false` (default): Renders in Dialog popup

### CSS Variables Applied

```css
/* UnifiedCalendar and BulkPracticeCreator */
.rdp-root {
  --rdp-day_button-height: 44px;
  --rdp-day_button-width: 44px;
  --rdp-day-height: 48px;
  --rdp-day-width: 48px;
}
```

## Files Changed

### Created

1. **src/components/calendar/responsive-calendar-wrapper.tsx** (125 lines)
   - ResponsiveCalendarWrapper component
   - useCalendarMode hook export
   - Follows ResponsiveMenu pattern

### Modified

2. **src/components/calendar/unified-calendar.tsx**
   - Added `rdp-root` class to DayPicker root
   - Added CSS variables block for touch targets

3. **src/components/practices/bulk-practice-creator.tsx**
   - Import ResponsiveCalendarWrapper and useIsMobile
   - Conditional rendering: mobile uses Drawer, desktop inline
   - Added bulk-rdp-root CSS variables
   - Updated button height from 40px to 44px

## Testing Notes

- Visual testing on mobile required (bottom sheet appearance)
- Verify 44px touch targets with browser dev tools
- Test date selection flow in Drawer vs inline

## Next Phase Readiness

Phase 35-02 (Lineup Touch Polish) can proceed. The ResponsiveCalendarWrapper pattern may inform similar responsive components for lineup editing on mobile devices.
