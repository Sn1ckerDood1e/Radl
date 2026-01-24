---
phase: 15-mobile-pwa-improvements
plan: 03
subsystem: pwa
tags: [mobile, gestures, swipe, touch, list-items]

# Dependency graph
requires:
  - phase: 15-01
    provides: "@use-gesture/react for touch gesture handling"
provides:
  - "useSwipeGesture hook for horizontal swipe detection"
  - "SwipeableListItem component for swipe-to-reveal actions"
affects: [15-05, 15-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [swipe-gesture-hook, mobile-only-component]

key-files:
  created:
    - src/hooks/use-swipe-gesture.ts
    - src/components/mobile/swipeable-list-item.tsx
  modified: []

key-decisions:
  - "requestAnimationFrame over react-spring - plan specified rAF for smooth animation back to center"
  - "Mobile-only behavior (< 768px) - desktop renders children directly without swipe functionality"
  - "Rubber band effect at bounds - elastic feel when dragging past max distance"
  - "touchAction: pan-y - allows vertical scroll while capturing horizontal swipe"

patterns-established:
  - "useSwipeGesture hook pattern: bind function + x offset + callbacks"
  - "Mobile-only component: useIsMobile hook for viewport detection"
  - "Action reveal pattern: absolute positioned backgrounds with opacity animation"

# Metrics
duration: 4min
completed: 2026-01-24
---

# Phase 15 Plan 03: Swipeable List Items Summary

**Swipeable list item infrastructure for mobile: useSwipeGesture hook wraps @use-gesture/react, SwipeableListItem shows delete (red) on swipe left, edit (blue) on swipe right**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-24T01:25:34Z
- **Completed:** 2026-01-24T01:29:10Z
- **Tasks:** 2/2
- **Files created:** 2

## Accomplishments

- Created useSwipeGesture hook wrapping @use-gesture/react's useDrag
- Implemented rubber band effect at bounds for elastic feel
- Created SwipeableListItem component with reveal action backgrounds
- Mobile-only behavior ensures desktop users get standard interactions
- Vertical scroll unaffected by horizontal swipe (axis: 'x' lock)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSwipeGesture hook** - `eceea4f` (feat)
2. **Task 2: Create SwipeableListItem component** - `c50ba31` (feat)

## Files Created

### src/hooks/use-swipe-gesture.ts

Hook for horizontal swipe gestures:

```typescript
export interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;   // default: 80px
  velocityThreshold?: number; // default: 0.3
  disabled?: boolean;
}

export interface UseSwipeGestureReturn {
  bind: (...args: unknown[]) => Record<string, unknown>;
  x: number;                           // current offset for transform
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | null;
}

export function useSwipeGesture(options?: UseSwipeGestureOptions): UseSwipeGestureReturn
```

### src/components/mobile/swipeable-list-item.tsx

Swipeable wrapper component:

```typescript
export interface SwipeableListItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;   // Delete action
  onSwipeRight?: () => void;  // Edit action
  leftLabel?: string;         // Default: "Edit"
  rightLabel?: string;        // Default: "Delete"
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SwipeableListItem(props: SwipeableListItemProps): JSX.Element
```

## Implementation Details

### Swipe Detection Logic

1. Track horizontal movement with `useDrag({ axis: 'x' })`
2. On drag end, check thresholds:
   - `|movement| > swipeThreshold` (80px)
   - OR `|velocity| > velocityThreshold` (0.3)
3. Call onSwipeLeft/onSwipeRight based on direction
4. Animate back to center with requestAnimationFrame

### Mobile-Only Behavior

- `useIsMobile()` hook detects viewport < 768px
- Desktop renders children directly (no wrapper)
- Matches CONTEXT.md Decision 5 (mobile only < 768px)

### Action Background Colors

- **Swipe left (delete):** `bg-red-500 text-white`
- **Swipe right (edit):** `bg-blue-500 text-white`
- Icons from lucide-react: Trash2, Pencil

## Decisions Made

1. **requestAnimationFrame animation** - Uses CSS transform with rAF for smooth 200ms ease-out return to center
2. **Rubber band effect** - 30% resistance beyond max distance (120px) for iOS-like feel
3. **Opacity animation** - Action backgrounds fade in based on swipe distance (full opacity at 80px)
4. **Mobile viewport check** - 768px breakpoint matches md: Tailwind breakpoint

## Deviations from Plan

None - plan executed exactly as written.

## Usage Example

```tsx
import { SwipeableListItem } from '@/components/mobile/swipeable-list-item';

function EquipmentList({ items, onDelete, onEdit }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <SwipeableListItem
            onSwipeLeft={() => onDelete(item.id)}
            onSwipeRight={() => onEdit(item.id)}
          >
            <EquipmentCard equipment={item} />
          </SwipeableListItem>
        </li>
      ))}
    </ul>
  );
}
```

## Next Phase Readiness

**Ready for integration:**
- SwipeableListItem can wrap any list item component
- Works with EquipmentCard, AthleteCard, PracticeCard
- Mobile-only ensures desktop UX unchanged

**Next steps:**
- 15-05: Integrate with existing card components
- 15-06: Final testing and polish

**No blockers or concerns.**

---
*Phase: 15-mobile-pwa-improvements*
*Completed: 2026-01-24*
