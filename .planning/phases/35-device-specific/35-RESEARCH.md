# Phase 35: Device-Specific Polish - Calendar & Drag-Drop - Research

**Researched:** 2026-01-29
**Domain:** Mobile Touch UI, Calendar Presentation, Drag-Drop Interactions
**Confidence:** HIGH

## Summary

This phase focuses on optimizing calendar and drag-drop interactions for mobile touch devices. The existing codebase already has solid foundations with react-day-picker v9.13.0, @dnd-kit/core v6.3.1, vaul v1.1.2, and @use-gesture/react v10.3.1 installed. The codebase demonstrates established patterns for responsive components (ResponsiveMenu, SwipeableListItem) and an existing useIsMobile hook.

The calendar implementation in UnifiedCalendar already uses 44px day button heights (verified in CSS), but needs mobile-specific presentation using a bottom sheet (Drawer) instead of inline. The drag-drop system in WaterLineupBuilder uses PointerSensor only, requiring TouchSensor with delay activation for mobile. The practice list is currently functional but may need horizontal scroll prevention.

**Primary recommendation:** Create responsive wrappers that detect mobile viewport and conditionally render calendar in Drawer, add TouchSensor with 250ms delay and explicit drag handles with touch-action: none, and add visual feedback (shadow, scale) during drag operations.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-day-picker | 9.13.0 | Calendar/date picker | Well-maintained, v9 has CSS variables for touch targets |
| @dnd-kit/core | 6.3.1 | Drag-drop foundation | Modern, accessible, has TouchSensor with delay |
| @dnd-kit/sortable | 10.0.0 | Sortable lists | Works with core sensors |
| vaul | 1.1.2 | Bottom sheet/drawer | Mobile-native feel, iOS sheet behavior |
| @use-gesture/react | 10.3.1 | Touch gesture handling | Already used for SwipeableListItem |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.562.0 | Icons (drag handles) | GripVertical icon for handles |
| tailwind-merge | 3.4.0 | Class merging | Conditional mobile styles |

### No New Dependencies Required
The existing stack fully supports all requirements. No new libraries needed.

## Architecture Patterns

### Recommended Component Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── drawer.tsx            # Existing vaul wrapper
│   │   └── responsive-calendar.tsx  # NEW: Calendar with mobile drawer
│   ├── calendar/
│   │   └── unified-calendar.tsx  # Existing, update for responsive
│   └── lineups/
│       ├── draggable-athlete.tsx # Update with drag handle
│       ├── athlete-card.tsx      # Update with handle prop
│       └── water-lineup-builder.tsx # Update sensors
└── hooks/
    ├── use-media-query.ts        # Existing
    └── use-touch-sensor.ts       # NEW: Pre-configured touch sensor
```

### Pattern 1: Responsive Calendar with Drawer
**What:** Calendar renders inline on desktop, in bottom sheet on mobile
**When to use:** Date picker fields, schedule views on mobile

```tsx
// Source: vaul docs + existing ResponsiveMenu pattern
'use client';
import { useIsMobile } from '@/hooks/use-media-query';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { DayPicker } from 'react-day-picker';

interface ResponsiveCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  trigger: React.ReactNode;
}

export function ResponsiveCalendar({ selected, onSelect, trigger }: ResponsiveCalendarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="pb-safe">
          <div className="p-4">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={onSelect}
              classNames={{
                day_button: 'min-h-[44px] min-w-[44px]', // Touch target
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: render inline or as popover
  return <DayPicker mode="single" selected={selected} onSelect={onSelect} />;
}
```

### Pattern 2: Touch Sensor with Hold Delay
**What:** TouchSensor with 250ms delay prevents accidental drags while scrolling
**When to use:** All drag-drop on touch devices

```tsx
// Source: dnd-kit Touch sensor docs
import {
  DndContext,
  TouchSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';

// Custom hook for mobile-friendly sensors
export function useDndSensors() {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement before drag on desktop
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms hold before drag
      tolerance: 5, // 5px tolerance during delay
    },
  });

  return useSensors(pointerSensor, touchSensor);
}

// Usage in DndContext
function LineupBuilder() {
  const sensors = useDndSensors();

  return (
    <DndContext sensors={sensors}>
      {/* draggable content */}
    </DndContext>
  );
}
```

### Pattern 3: Explicit Drag Handle with touch-action
**What:** Drag handle icon with touch-action: none, rest of card scrollable
**When to use:** Draggable items in scrollable lists

```tsx
// Source: dnd-kit drag handle docs
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div ref={setNodeRef} style={{ transform, transition }}>
      <div className="flex items-center gap-2">
        {/* Drag handle - only this triggers drag */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing p-2"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5 text-zinc-500" />
        </button>

        {/* Card content - scrollable */}
        <div className={isDragging ? 'opacity-50' : ''}>
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 4: Visual Feedback During Drag
**What:** Shadow, scale, and color change when dragging
**When to use:** DragOverlay and dragging state

```tsx
// Source: dnd-kit DragOverlay docs
import { DragOverlay } from '@dnd-kit/core';

// In DragOverlay
<DragOverlay>
  {activeId && (
    <div
      className="transform scale-105 shadow-lg shadow-black/20 ring-2 ring-teal-500 rounded-lg"
      style={{ cursor: 'grabbing' }}
    >
      <AthleteCard athlete={activeAthlete} compact />
    </div>
  )}
</DragOverlay>

// Tailwind classes for drag states
const dragStyles = {
  idle: 'cursor-grab',
  dragging: 'opacity-50 cursor-grabbing', // placeholder
  overlay: 'scale-105 shadow-lg shadow-black/20 ring-2 ring-teal-500', // overlay
};
```

### Anti-Patterns to Avoid
- **touch-action: none on entire container:** Prevents scrolling. Only use on drag handle.
- **PointerSensor without TouchSensor:** Works poorly on mobile - no hold-to-drag.
- **Applying DragOverlay transform to actual item:** Causes position issues; use separate overlay.
- **Rendering calendar inline on mobile:** Takes too much space, bottom sheet is better UX.
- **Conditional rendering of DragOverlay:** Breaks drop animation; always render.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch vs mouse detection | Custom touch event handling | @dnd-kit TouchSensor | Handles edge cases, activation constraints |
| Mobile bottom sheet | Custom modal with drag | vaul Drawer | iOS-native feel, snap points, accessibility |
| Hold-to-drag gesture | setTimeout + touchstart | TouchSensor delay option | Handles tolerance, cancellation properly |
| Calendar touch targets | Inline CSS sizing | CSS variables --rdp-day_button-width | Consistent with react-day-picker internals |
| Responsive component switching | window.innerWidth checks | useMediaQuery hook | SSR safe, debounced, reactive |

**Key insight:** The libraries already handle the complex touch interaction edge cases (scrolling vs dragging, accidental touches, hold detection). Custom implementations inevitably miss cases.

## Common Pitfalls

### Pitfall 1: Scroll Interference with Drag
**What goes wrong:** Touch drag triggers page scroll, or scroll triggers accidental drags
**Why it happens:** Conflicting touch-action CSS, no activation delay
**How to avoid:**
- Use `touch-action: none` ONLY on drag handles, not containers
- Use `touch-action: pan-y` on horizontal-only drags
- Set TouchSensor delay (250ms) with tolerance (5px)
**Warning signs:** Users report items "jumping" or scroll not working in lists

### Pitfall 2: Calendar Too Small for Touch
**What goes wrong:** Users mis-tap dates, frustrating experience
**Why it happens:** Default day button size too small for fingers
**How to avoid:**
- Use react-day-picker CSS variables: `--rdp-day_button-height: 44px`
- Add padding around calendar in Drawer
- Test on actual devices, not just Chrome DevTools
**Warning signs:** User feedback about "hard to tap dates"

### Pitfall 3: DragOverlay Render Issues
**What goes wrong:** Drop animation doesn't work, overlay flickers
**Why it happens:** Conditional rendering of DragOverlay, or wrong content
**How to avoid:**
- Always render DragOverlay, conditionally show content inside
- Render same component in overlay as in list (or simplified version)
- Memoize overlay content
**Warning signs:** Items "snap" instead of animate when dropped

### Pitfall 4: Missing Drag Handle Accessibility
**What goes wrong:** Screen reader users can't drag items
**Why it happens:** Drag handle is div with listeners, not button
**How to avoid:**
- Use `<button>` for drag handle with aria-label
- Include keyboard instructions in attributes from useSortable
- Announce drag start/end to screen readers
**Warning signs:** Accessibility audit fails on draggable elements

### Pitfall 5: Drawer Safe Area Issues
**What goes wrong:** Calendar content hidden behind iOS home indicator
**Why it happens:** Drawer content doesn't account for safe area
**How to avoid:**
- Add `pb-safe` class to DrawerContent (Phase 32 decision)
- Test on iOS devices with gesture navigation
**Warning signs:** Content cut off on iPhone X and later

## Code Examples

Verified patterns from official sources:

### react-day-picker Touch Targets (CSS Variables)
```css
/* Source: daypicker.dev/docs/styling */
.rdp-root {
  --rdp-day_button-height: 44px;
  --rdp-day_button-width: 44px;
  --rdp-day-height: 48px;
  --rdp-day-width: 48px;
}
```

### TouchSensor with Delay
```tsx
// Source: docs.dndkit.com/api-documentation/sensors/touch
import { TouchSensor, useSensor } from '@dnd-kit/core';

const touchSensor = useSensor(TouchSensor, {
  activationConstraint: {
    delay: 250,
    tolerance: 5,
  },
});
```

### Vaul Drawer for Calendar
```tsx
// Source: vaul.emilkowal.ski/api
import { Drawer } from 'vaul';

<Drawer.Root>
  <Drawer.Trigger asChild>
    <button>Select Date</button>
  </Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40" />
    <Drawer.Content className="bg-zinc-900 fixed bottom-0 left-0 right-0 rounded-t-[10px]">
      <div className="p-4">
        <DayPicker />
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

### Drag Handle with touch-action
```tsx
// Source: docs.dndkit.com (drag handle pattern)
<button
  {...attributes}
  {...listeners}
  className="touch-none" // Tailwind for touch-action: none
  aria-label="Drag to reorder"
>
  <GripVertical className="h-5 w-5" />
</button>
```

### DragOverlay Visual Feedback
```tsx
// Source: dnd-kit docs + existing AthleteCard pattern
<DragOverlay dropAnimation={{ duration: 200 }}>
  {activeId ? (
    <div className="transform scale-105 shadow-xl shadow-black/25 ring-2 ring-teal-500/50 rounded-lg">
      <AthleteCard athlete={activeAthlete} isDragging />
    </div>
  ) : null}
</DragOverlay>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Modal dialog for mobile calendar | Bottom sheet (Drawer) | 2023-2024 | Better UX, native iOS feel |
| PointerSensor only | TouchSensor + PointerSensor combined | Always recommended | Proper touch delay |
| Touch detection via user-agent | matchMedia + pointer queries | 2022+ | More reliable |
| Custom swipe-to-drag | TouchSensor delay constraint | Built into dnd-kit | Cleaner code |

**Deprecated/outdated:**
- react-day-picker v8 class names (changed in v9: `day` -> `day_button`, `cell` -> `day`)
- vaul `shouldScaleBackground` default (now requires data attribute on wrapper)

## Open Questions

Things that couldn't be fully resolved:

1. **Practice List Horizontal Scroll**
   - What we know: Requirement states "no horizontal scroll on mobile"
   - What's unclear: Current practice-list-client.tsx doesn't show obvious horizontal issues
   - Recommendation: Test on actual device, may only need responsive table/list adjustments

2. **Vaul Maintenance Status**
   - What we know: GitHub shows "This repo is unmaintained" notice
   - What's unclear: Whether this affects 1.x stability
   - Recommendation: vaul is stable at 1.1.2, shadcn/ui still uses it; proceed but monitor

## Sources

### Primary (HIGH confidence)
- [dnd-kit Touch Sensor docs](https://docs.dndkit.com/api-documentation/sensors/touch) - delay and tolerance config
- [dnd-kit Drag Overlay docs](https://docs.dndkit.com/api-documentation/draggable/drag-overlay) - visual feedback
- [react-day-picker Styling docs](https://daypicker.dev/docs/styling) - CSS variables for touch targets
- [vaul API Reference](https://vaul.emilkowal.ski/api) - Drawer props and usage
- [@use-gesture docs](https://use-gesture.netlify.app/docs/options/) - preventScroll and delay options

### Secondary (MEDIUM confidence)
- Existing codebase patterns: ResponsiveMenu, SwipeableListItem, useSwipeGesture
- [GitHub issue dnd-kit #435](https://github.com/clauderic/dnd-kit/issues/435) - PointerSensor touch issues

### Tertiary (LOW confidence)
- WebSearch results for mobile drag-drop best practices 2025 - general guidance only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and working
- Architecture: HIGH - Patterns verified in official docs and existing codebase
- Pitfalls: HIGH - Well-documented in library docs and GitHub issues
- Calendar touch targets: HIGH - react-day-picker CSS variables documented
- Drag handle pattern: HIGH - dnd-kit official recommendation

**Research date:** 2026-01-29
**Valid until:** 60 days (stable libraries, unlikely to change)
