# Phase 22: Practice Flow Redesign - Research

**Researched:** 2026-01-26
**Domain:** Inline editing, drag-drop interfaces, workout builders, bulk operations
**Confidence:** HIGH

## Summary

This phase rebuilds practice creation/editing with three core UI patterns: inline editing with autosave, drag-and-drop lineup assignment, and PM5-inspired workout builders. The application already uses @dnd-kit 6.3.1, React 19.2.3, Next.js 16.1.3, react-hook-form 7.71.1, and Sonner 2.0.7, providing a solid foundation for the required functionality.

The standard approach combines React 19's `useOptimistic` for instant feedback during saves, @dnd-kit's `rectSwappingStrategy` for seat swapping behavior, and `useFieldArray` from react-hook-form for dynamic workout interval builders. The existing codebase already has toast helpers, drag-drop components, and practice validation schemas in place.

**Primary recommendation:** Use inline editing without edit modes (always editable), silent autosave on blur with error-only toasts, @dnd-kit's swap strategy for lineup builder, and structured interval forms inspired by PM5's workout types (single time, single distance, intervals, variable intervals).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 ✓ | Drag-drop foundation | Modern, accessible, performant - official React DnD toolkit 2026 |
| @dnd-kit/sortable | 10.0.0 ✓ | Sortable/swappable items | Built-in swap strategy, multiple container support |
| @dnd-kit/utilities | 3.2.2 ✓ | Transform utilities | CSS.Transform helpers, arrayMove/arraySwap |
| react-hook-form | 7.71.1 ✓ | Form state management | Industry standard, excellent performance, built-in validation |
| zod | 4.3.5 ✓ | Schema validation | Type-safe validation, already used throughout codebase |
| sonner | 2.0.7 ✓ | Toast notifications | Modern, accessible, promise support for async operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 9.13.0 ✓ | Date selection | Bulk practice creation - supports range mode |
| date-fns | 4.1.0 ✓ | Date manipulation | Recurring date calculations, date range generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-dnd | @dnd-kit has better performance, hooks API, built-in accessibility |
| react-hook-form | Formik | RHF has better performance, smaller bundle, less re-renders |
| react-day-picker | MUI X Date Range Picker | react-day-picker is lighter, already installed, no MUI dependency |

**Installation:**
```bash
# All required libraries already installed
# No additional dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── practices/
│   │   ├── inline-practice-editor.tsx     # Main inline editing component
│   │   ├── block-list.tsx                 # Draggable block list
│   │   ├── block-editor.tsx               # Individual block editor (inline)
│   │   ├── workout-builder.tsx            # PM5-style interval builder
│   │   ├── lineup-builder.tsx             # Drag-drop lineup assignment
│   │   └── bulk-practice-creator.tsx      # Date range + template selector
│   └── shared/
│       ├── inline-text-field.tsx          # Reusable autosave text input
│       └── inline-textarea.tsx            # Reusable autosave textarea
├── lib/
│   ├── validations/
│   │   └── workout.ts                     # Workout interval schemas
│   └── hooks/
│       ├── use-autosave.ts                # Debounced autosave hook
│       └── use-lineup-drag.ts             # Lineup drag-drop logic
└── app/
    └── api/
        └── practices/
            ├── bulk/route.ts              # Bulk create endpoint
            └── [id]/
                ├── blocks/[blockId]/
                │   ├── workout/route.ts   # Workout CRUD
                │   └── lineup/route.ts    # Lineup CRUD
                └── route.ts               # Practice inline updates
```

### Pattern 1: Inline Editing with Silent Autosave
**What:** Fields are always editable, save automatically on blur, show errors only
**When to use:** All practice/block metadata fields (name, notes, details)
**Example:**
```typescript
// Source: React Hook Form discussions + React 19 useOptimistic
import { useOptimistic } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

function InlineTextField({ value, onSave, fieldName }) {
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const { register, handleSubmit } = useForm({ defaultValues: { [fieldName]: value } });

  const handleBlur = async (data) => {
    if (data[fieldName] === value) return; // No change, skip save

    setOptimisticValue(data[fieldName]); // Immediate UI update

    try {
      await onSave(data[fieldName]);
      // Silent success - no toast
    } catch (error) {
      setOptimisticValue(value); // Rollback on error
      toast.error('Failed to save', {
        description: error.message,
        action: {
          label: 'Retry',
          onClick: () => onSave(data[fieldName])
        },
        duration: Infinity
      });
    }
  };

  return (
    <input
      {...register(fieldName)}
      onBlur={handleSubmit(handleBlur)}
      defaultValue={optimisticValue}
      className="border-transparent hover:border-gray-300 focus:border-blue-500"
    />
  );
}
```

### Pattern 2: Drag-Drop Lineup Builder with Swap
**What:** Athletes panel on left, boat seats on right, drag to assign/swap
**When to use:** Water block lineup assignment
**Example:**
```typescript
// Source: @dnd-kit documentation - rectSwappingStrategy
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSwappingStrategy, arraySwap } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';

function LineupBuilder({ athletes, boat, onUpdate }) {
  const [seats, setSeats] = useState(boat.seats); // [{ id, athleteId }, ...]
  const availableAthletes = athletes.filter(a =>
    !seats.some(s => s.athleteId === a.id)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSeats(seats => {
      const oldIndex = seats.findIndex(s => s.athleteId === active.id);
      const newIndex = seats.findIndex(s => s.id === over.id);

      // Swap athletes between seats
      return arraySwap(seats, oldIndex, newIndex);
    });

    // Autosave after swap
    onUpdate(seats);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4">
        {/* Available athletes panel */}
        <SortableContext items={availableAthletes} strategy={rectSwappingStrategy}>
          {availableAthletes.map(athlete => (
            <DraggableAthlete key={athlete.id} athlete={athlete} />
          ))}
        </SortableContext>

        {/* Boat seats */}
        <SortableContext items={seats} strategy={rectSwappingStrategy}>
          {seats.map(seat => (
            <DropSeat key={seat.id} seat={seat} athlete={getAthlete(seat.athleteId)} />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}
```

### Pattern 3: PM5-Style Workout Builder
**What:** Add intervals one by one, each with work/rest duration and target metrics
**When to use:** Erg and water block workout definitions
**Example:**
```typescript
// Source: Concept2 PM5 workout types + react-hook-form useFieldArray
import { useFieldArray } from 'react-hook-form';

function WorkoutBuilder({ control, workoutType }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'intervals'
  });

  const addInterval = () => {
    append({
      type: 'work',
      durationType: 'time', // or 'distance'
      duration: 0,
      targetSplit: null, // for erg
      targetStrokeRate: null, // for water
      restDuration: 0,
      restType: 'time' // or 'undefined'
    });
  };

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-center">
          <select {...control.register(`intervals.${index}.durationType`)}>
            <option value="time">Time</option>
            <option value="distance">Distance</option>
          </select>
          <input
            type="number"
            {...control.register(`intervals.${index}.duration`)}
            placeholder="Duration/Distance"
          />
          <input
            type="number"
            {...control.register(`intervals.${index}.targetStrokeRate`)}
            placeholder="Stroke rate"
          />
          <button onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button onClick={addInterval}>+ Add Interval</button>
    </div>
  );
}
```

### Pattern 4: Bulk Practice Creation
**What:** Date range picker + day selector + optional template
**When to use:** Creating recurring practices (e.g., MWF for a season)
**Example:**
```typescript
// Source: react-day-picker range mode + date-fns
import { DayPicker } from 'react-day-picker';
import { eachDayOfInterval, getDay } from 'date-fns';

function BulkPracticeCreator({ seasonId, onSubmit }) {
  const [range, setRange] = useState<DateRange>();
  const [selectedDays, setSelectedDays] = useState([1, 3, 5]); // Mon, Wed, Fri
  const [time, setTime] = useState('06:00');

  const handleCreate = async () => {
    if (!range?.from || !range?.to) return;

    // Generate all dates in range matching selected days
    const allDates = eachDayOfInterval({ start: range.from, end: range.to });
    const practiceDates = allDates.filter(date =>
      selectedDays.includes(getDay(date))
    );

    // Create practices
    await onSubmit(practiceDates.map(date => ({
      seasonId,
      date,
      startTime: time,
      // ... other fields
    })));
  };

  return (
    <div>
      <DayPicker mode="range" selected={range} onSelect={setRange} />
      <DaySelector selected={selectedDays} onChange={setSelectedDays} />
      <input type="time" value={time} onChange={e => setTime(e.target.value)} />
      <button onClick={handleCreate}>Create {practiceDates.length} Practices</button>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Edit mode toggling:** Don't use separate "edit" and "view" modes - fields should always be editable with visual affordance on hover
- **Success toasts for autosave:** Silent saves reduce notification fatigue - only show errors
- **Saving on every keystroke:** Use onBlur, not onChange, to prevent excessive API calls and race conditions
- **Custom drag-drop from scratch:** @dnd-kit provides accessibility, keyboard nav, and mobile support out of the box
- **Optimistic updates without rollback:** Always implement error handling that reverts UI state on save failure

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-drop with keyboard nav | Custom mouse handlers | @dnd-kit with sortableKeyboardCoordinates | Accessibility, ARIA, screen readers, mobile |
| Autosave with race conditions | setTimeout + fetch | useOptimistic + debounced saves | React 19 handles pending states, rollback |
| Date range generation | Manual date loops | date-fns eachDayOfInterval | Handles DST, leap years, timezones |
| Form array validation | Manual field tracking | react-hook-form useFieldArray | Automatic validation, dirty state, errors |
| Toast with retry | Custom notification components | Sonner toast.error with action | Accessibility, stacking, promises, animations |
| Swap two array items | Manual splice logic | @dnd-kit/utilities arraySwap | Immutable updates, type-safe |
| Collision detection | getBoundingClientRect loops | @dnd-kit closestCenter | Optimized, handles edge cases, configurable |

**Key insight:** Inline editing has many edge cases - blur timing, validation order, concurrent edits, optimistic updates, error recovery. React 19's useOptimistic + react-hook-form handles 90% of complexity. Custom solutions miss accessibility, race conditions, and rollback logic.

## Common Pitfalls

### Pitfall 1: Autosave Race Conditions
**What goes wrong:** User edits Field A, blurs (triggers save), immediately edits Field B, blurs (triggers second save). If save 2 completes before save 1, data gets overwritten.
**Why it happens:** Multiple concurrent PATCH requests without coordination
**How to avoid:**
- Use React 19's `useTransition` to track pending saves
- Queue saves or use a debounce at the component level
- Consider PATCH-ing only changed fields, not full object
- Server should use optimistic locking (version field) to detect conflicts
**Warning signs:** Intermittent data loss, fields reverting to old values, console errors about "stale data"

**Solution pattern:**
```typescript
const [isPending, startTransition] = useTransition();

const handleSave = (field, value) => {
  startTransition(async () => {
    await updatePractice({ [field]: value });
  });
};

// Disable editing during pending saves
<input disabled={isPending} onBlur={handleSave} />
```

### Pitfall 2: @dnd-kit Re-render Performance
**What goes wrong:** Dragging becomes janky with 20+ draggable items, especially on mobile
**Why it happens:** All draggable/droppable components re-render on every drag event when using default settings
**How to avoid:**
- Use `DragOverlay` for scrollable lists - renders dragged item outside normal flow
- Memoize draggable components with React.memo
- Use `closestCenter` or `closestCorners` collision detection (more forgiving than rectIntersection)
- Avoid heavy computation in draggable render functions
**Warning signs:** FPS drops during drag, laggy animations, browser profiler shows excessive renders

**Reference:** [GitHub Issue #389](https://github.com/clauderic/dnd-kit/issues/389) - Unnecessary rerenders cause poor performance

### Pitfall 3: Blur Event Fires Before Validation
**What goes wrong:** Custom onBlur handler accesses isValid, but it's still false because RHF hasn't validated yet
**Why it happens:** Custom onBlur runs before react-hook-form's internal onBlur
**How to avoid:**
- Use `handleSubmit(onBlur)` wrapper - validation runs first, then your handler
- Don't access formState.isValid directly in blur handlers
- Use Controller component for complex blur logic with validation
**Warning signs:** Save attempts with invalid data, validation errors appearing after save attempt

**Correct pattern:**
```typescript
// BAD: validation hasn't run yet
<input onBlur={() => { if (isValid) save(); }} />

// GOOD: handleSubmit ensures validation first
<input onBlur={handleSubmit(data => save(data))} />
```

### Pitfall 4: Server/Client ARIA ID Mismatch (SSR Hydration)
**What goes wrong:** @dnd-kit generates unique IDs for `aria-describedby`, but server and client generate different IDs, causing hydration errors
**Why it happens:** Random ID generation during SSR doesn't match client render
**How to avoid:**
- Use `suppressHydrationWarning` on DndContext wrapper (temporary)
- Or render DndContext only on client with `'use client'` directive (Next.js)
- Or use stable IDs based on data, not random generation
**Warning signs:** Console hydration warnings mentioning aria-describedby, drag-drop not working after SSR

**Reference:** [GitHub Issue #1](https://github.com/dancreightondev/snippets/issues/1) - Hydration mismatch with @dnd-kit

### Pitfall 5: Debounce vs Throttle for Autosave
**What goes wrong:** Using debounce for autosave means user types for 30 seconds, pauses briefly, then navigates away - save never fires
**Why it happens:** Debounce waits until activity stops; if user leaves before pause, no save
**How to avoid:**
- **Use throttle, not debounce** for autosave - ensures regular save checkpoints
- Or combine: throttle during typing (every 3s), debounce after pause (500ms)
- Always save on page unload (beforeunload event)
**Warning signs:** Users report lost work, saves only happen when explicitly pausing

**Reference:** [Codemzy's Blog](https://www.codemzy.com/blog/throttle-vs-debounce) - "For autosaving, throttle is the way to go"

### Pitfall 6: PM5 Interval Limits
**What goes wrong:** Coaches create 60-interval workout, athletes can't load it on PM5
**Why it happens:** PM5 hardware limit is 50 intervals maximum
**How to avoid:**
- Add validation: max 50 intervals per workout
- Show interval count in UI
- Provide warning when approaching limit (e.g., at 45)
**Warning signs:** Workout loads in web but fails to sync to PM5 monitor

**Reference:** [Concept2 Forum](https://www.c2forum.com/viewtopic.php?t=208549) - PM5 allows maximum of 50 intervals

### Pitfall 7: Variable Interval Workout Type Detection
**What goes wrong:** Workout has different interval durations but doesn't display correct pace targets on PM5
**Why it happens:** PM5 requires workout type to be "Variable Interval" for different pace targets per interval
**How to avoid:**
- Detect when intervals have different work durations or targets
- Automatically set workout type to "Variable Interval"
- For homogeneous intervals, use standard "Interval" type
**Warning signs:** Pace boat on PM5 shows same target for all intervals despite different settings

**Reference:** [Concept2 Forum](https://www.c2forum.com/viewtopic.php?t=208549) - PM5 requires "Interval Variable" type for different paces

## Code Examples

Verified patterns from official sources:

### Autosave with Error Recovery
```typescript
// Source: React 19 useOptimistic + Sonner toast patterns
import { useOptimistic } from 'react';
import { showErrorToast } from '@/lib/toast-helpers';

function useAutosave<T>(initialValue: T, saveFn: (value: T) => Promise<void>) {
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);

  const save = async (newValue: T) => {
    if (newValue === initialValue) return; // Skip if unchanged

    setOptimisticValue(newValue); // Immediate UI update

    try {
      await saveFn(newValue);
      // Silent success
    } catch (error) {
      setOptimisticValue(initialValue); // Rollback
      showErrorToast({
        message: 'Failed to save changes',
        description: error.message,
        retry: () => save(newValue)
      });
    }
  };

  return { value: optimisticValue, save };
}
```

### Multiple Drop Zones (Available Athletes + Multiple Boats)
```typescript
// Source: @dnd-kit documentation - Multiple Containers pattern
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

function MultiBoatLineup({ athletes, boats, onUpdate }) {
  const [activeId, setActiveId] = useState(null);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    // Determine source and destination containers
    const sourceBoat = findBoatContainingAthlete(active.id);
    const destBoat = findBoatFromSeatId(over.id);

    if (sourceBoat === destBoat) {
      // Same boat: swap seats
      updateBoatLineup(destBoat, arraySwap(...));
    } else {
      // Different boats or from available panel: move athlete
      removeAthleteFrom(sourceBoat, active.id);
      addAthleteTo(destBoat, over.id, active.id);
    }

    onUpdate(boats);
  };

  return (
    <DndContext onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
      {/* Available athletes - their own SortableContext */}
      <SortableContext items={availableAthletes}>
        {availableAthletes.map(a => <AthleteCard key={a.id} athlete={a} />)}
      </SortableContext>

      {/* Each boat gets its own SortableContext */}
      {boats.map(boat => (
        <SortableContext key={boat.id} items={boat.seats} strategy={rectSwappingStrategy}>
          {boat.seats.map(seat => <Seat key={seat.id} seat={seat} />)}
        </SortableContext>
      ))}

      {/* DragOverlay for smooth dragging */}
      <DragOverlay>
        {activeId ? <AthleteCard athlete={getAthlete(activeId)} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Keyboard-Accessible Drag-Drop Setup
```typescript
// Source: @dnd-kit documentation - Accessibility
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

function AccessibleLineupBuilder() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental drags)
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates, // Arrow keys move to closest item
    })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}>
      {/* ... draggable content ... */}
    </DndContext>
  );
}
```

### Dynamic Workout Intervals with Validation
```typescript
// Source: react-hook-form useFieldArray + PM5 constraints
import { useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';

const intervalSchema = z.object({
  durationType: z.enum(['time', 'distance']),
  duration: z.number().positive(),
  targetStrokeRate: z.number().int().min(16).max(40).optional(),
  targetSplit: z.string().optional(), // "2:05.0" format
  restDuration: z.number().min(0),
  restType: z.enum(['time', 'undefined']),
});

const workoutSchema = z.object({
  type: z.enum(['single_time', 'single_distance', 'intervals', 'variable_intervals']),
  intervals: z.array(intervalSchema).max(50, 'PM5 limit: 50 intervals maximum'),
}).refine(data => {
  // Auto-detect variable intervals
  if (data.intervals.length > 1) {
    const firstDuration = data.intervals[0].duration;
    const hasVariableDurations = data.intervals.some(i => i.duration !== firstDuration);
    return hasVariableDurations ? data.type === 'variable_intervals' : true;
  }
  return true;
}, {
  message: 'Intervals with different durations require "Variable Intervals" type',
  path: ['type']
});

function WorkoutBuilder({ control }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'intervals' });
  const intervalCount = useWatch({ control, name: 'intervals' })?.length || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3>Intervals</h3>
        <span className={intervalCount >= 45 ? 'text-yellow-500' : ''}>
          {intervalCount} / 50
        </span>
      </div>
      {/* ... interval fields ... */}
      <button
        onClick={() => append(defaultInterval)}
        disabled={intervalCount >= 50}
      >
        + Add Interval
      </button>
    </div>
  );
}
```

### Bulk Practice Creation with Date Range
```typescript
// Source: react-day-picker v9 range mode + date-fns
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { eachDayOfInterval, getDay, format } from 'date-fns';

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

function BulkPracticeCreator({ seasonId, onSubmit }) {
  const [range, setRange] = useState<{ from: Date; to: Date }>();
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([1, 3, 5]); // Mon, Wed, Fri
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('08:00');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const calculatePractices = () => {
    if (!range?.from || !range?.to) return [];

    const allDates = eachDayOfInterval({ start: range.from, end: range.to });
    return allDates.filter(date => selectedDays.includes(getDay(date) as DayOfWeek));
  };

  const practiceDates = calculatePractices();

  const handleCreate = async () => {
    const practices = practiceDates.map(date => ({
      seasonId,
      name: `Practice - ${format(date, 'MMM dd, yyyy')}`,
      date: date.toISOString(),
      startTime: combineDateAndTime(date, startTime),
      endTime: combineDateAndTime(date, endTime),
      templateId, // Optional: apply template structure
    }));

    await onSubmit(practices);
  };

  return (
    <div className="space-y-4">
      <DayPicker
        mode="range"
        selected={range}
        onSelect={setRange}
        min={1} // Minimum 1 night
      />

      <div className="flex gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
          <button
            key={day}
            onClick={() => toggleDay(i as DayOfWeek)}
            className={selectedDays.includes(i as DayOfWeek) ? 'bg-blue-500' : 'bg-gray-200'}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>

      <button onClick={handleCreate} disabled={practiceDates.length === 0}>
        Create {practiceDates.length} Practice{practiceDates.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Edit button → form mode → save button | Always-editable inline fields with autosave | ~2022-2023 (Google Docs, Notion) | Fewer clicks, faster editing, feels native |
| react-beautiful-dnd | @dnd-kit | 2021 (rbd deprecated) | Better performance, hooks API, smaller bundle, active maintenance |
| Custom autosave with setTimeout | React 19 useOptimistic + useTransition | Dec 2024 (React 19 release) | Built-in pending states, error rollback, no race conditions |
| Manual optimistic updates | useOptimistic hook | Dec 2024 (React 19 release) | Automatic rollback on error, simpler code |
| Success toasts for every save | Silent saves, error-only toasts | 2023-2024 (Figma, Linear) | Reduces notification fatigue, less visual noise |
| Debounce for autosave | Throttle for autosave | Ongoing best practice | Prevents data loss if user navigates away quickly |

**Deprecated/outdated:**
- `react-beautiful-dnd`: No longer maintained, use @dnd-kit instead
- `aria-grabbed` attribute: Removed from ARIA 1.3, use role and aria-describedby patterns from @dnd-kit
- Manual form array management: react-hook-form's useFieldArray handles all complexity
- Edit mode toggles: Modern UIs (Notion, Linear, Airtable) use always-editable inline fields

## Open Questions

Things that couldn't be fully resolved:

1. **PM5 Workout Export Format**
   - What we know: PM5 supports interval workouts with time/distance, rest periods, variable intervals
   - What's unclear: Exact file format or API for exporting workouts from web to PM5 monitor (if direct sync is planned)
   - Recommendation: Start with web-only workout builder, add PM5 export in future phase if needed. ErgData app may provide insights.

2. **Concurrent Edit Handling**
   - What we know: Multiple coaches could edit same practice simultaneously
   - What's unclear: Server-side strategy for conflict resolution (last-write-wins vs optimistic locking)
   - Recommendation: Implement optimistic locking with version field in database, return 409 Conflict if version mismatch, prompt user to refresh and retry

3. **Undo/Redo for Inline Edits**
   - What we know: Users expect Cmd+Z to undo, especially for drag-drop and autosaved changes
   - What's unclear: Whether to implement undo/redo for autosaved changes (complex state management)
   - Recommendation: Skip for MVP - inline edits are small, users can manually revert. Add later if user feedback demands it.

4. **Mobile Drag-Drop UX**
   - What we know: @dnd-kit supports touch events, but long-press to drag can conflict with scrolling
   - What's unclear: Best mobile UX - drag handles only? Long-press activation? Separate mobile flow?
   - Recommendation: Test @dnd-kit's default touch behavior first. Add explicit drag handles if mobile testing shows usability issues.

## Sources

### Primary (HIGH confidence)
- [@dnd-kit Documentation - Sortable](https://docs.dndkit.com/presets/sortable) - Sortable preset, useSortable hook, collision detection
- [@dnd-kit Documentation - Draggable](https://docs.dndkit.com/api-documentation/draggable) - useDraggable, DragOverlay, sensors
- [React 19 useOptimistic](https://react.dev/reference/react/useOptimistic) - Official React docs for optimistic updates
- [React Hook Form Discussions #2494](https://github.com/react-hook-form/react-hook-form/discussions/2494) - Autosave on blur patterns
- [React DayPicker Selection Modes](https://daypicker.dev/docs/selection-modes) - Range mode, multiple dates
- [Sonner Documentation (shadcn/ui)](https://ui.shadcn.com/docs/components/sonner) - Toast patterns, error handling

### Secondary (MEDIUM confidence)
- [How to build an inline edit component in React](https://www.emgoto.com/react-inline-edit/) - Inline editing patterns
- [Throttle vs Debounce - Codemzy](https://www.codemzy.com/blog/throttle-vs-debounce) - Autosave timing strategies
- [Taming the dragon: Accessible drag and drop - React Aria](https://react-aria.adobe.com/blog/drag-and-drop) - Accessibility patterns
- [Building Dynamic Forms with React Hook Form](https://medium.com/@greennolgaa/building-dynamic-forms-with-react-hook-form-2119c144d717) - useFieldArray patterns
- [Next.js 16 Release Blog](https://nextjs.org/blog/next-16) - updateTag API for read-your-writes semantics
- [Create multiple drag and drop list like Trello](https://medium.com/@kurniawanc/create-multiple-drag-and-drop-list-like-trello-in-react-js-using-dnd-kit-library-b2acd9a65fab) - Multiple containers pattern

### Tertiary (LOW confidence - WebSearch only, marked for validation)
- [Concept2 Forum - PM5 Intervals](https://www.c2forum.com/viewtopic.php?t=208549) - PM5 50-interval limit, variable interval type
- [Erg Workouts - Aqueduct Rowing Club](https://www.aqueductrowingclub.com/about/erg-workouts) - Stroke rate guidelines (18-22 steady, 24-28 threshold, 28-36 race)
- [@dnd-kit GitHub Issue #389](https://github.com/clauderic/dnd-kit/issues/389) - Performance issues with many draggable items
- [@dnd-kit Hydration Issue](https://github.com/dancreightondev/snippets/issues/1) - SSR hydration warnings with aria-describedby

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use, official documentation verified
- Architecture patterns: HIGH - React 19 useOptimistic, @dnd-kit, and react-hook-form patterns from official docs
- Inline editing: HIGH - React Hook Form official discussions, React 19 official docs, established patterns
- Drag-drop: HIGH - @dnd-kit official documentation, verified examples, proven implementation
- Workout builder: MEDIUM - PM5 concepts verified but exact UX patterns inferred from community sources
- Bulk operations: HIGH - react-day-picker and date-fns official documentation
- Pitfalls: MEDIUM-HIGH - Performance issues documented in GitHub, autosave patterns from multiple credible sources

**Research date:** 2026-01-26
**Valid until:** 30 days (2026-02-25) - Libraries are stable, React 19 recently released, patterns mature
