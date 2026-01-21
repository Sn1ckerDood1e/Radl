# Phase 3: Lineup Management - Research

**Researched:** 2026-01-21
**Domain:** Drag-and-drop roster assignment, equipment compatibility validation, rowing terminology
**Confidence:** HIGH

## Summary

Lineup management requires building a drag-and-drop interface for assigning athletes to specific seat positions in boats (water blocks) or to groups (land/erg blocks), with equipment compatibility validation and template-based reusability. Research focused on three primary domains:

1. **Drag-and-drop libraries** - dnd-kit emerged as the clear choice for 2026, replacing deprecated react-beautiful-dnd
2. **Rowing domain terminology** - Standard position naming (Bow, 2-7, Stroke, Coxswain) and side designations (port/starboard) are critical for coach acceptance
3. **Equipment compatibility validation** - Filtering by size/availability and warning for double-booking prevents common mistakes

The standard approach uses dnd-kit's sortable preset for drag-and-drop with React Hook Form's useFieldArray for managing dynamic athlete assignments, Zod refinements for complex validation rules, and the existing tempId pattern (nanoid) for unsaved lineup state.

**Primary recommendation:** Use @dnd-kit/core with @dnd-kit/sortable for lineup building, implement boat compatibility as filter-first (hide incompatible) with warnings for edge cases (double booking), and maintain rowing terminology throughout the UI.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.x | Drag-and-drop foundation | Modern replacement for react-beautiful-dnd; 5.3M+ weekly downloads, accessible, performant |
| @dnd-kit/sortable | 8.x | Sortable list preset | Built-in support for vertical lists, multi-container sorting, keyboard navigation |
| @dnd-kit/utilities | 3.x | Helper utilities | CSS transforms, position calculations |
| react-hook-form | 7.71.1 | Form state management | Already in codebase; useFieldArray perfect for dynamic athlete lists |
| zod | 4.3.5 | Validation schemas | Already in codebase; .refine() and .superRefine() for complex rules |
| nanoid | latest | Temporary IDs | Already in codebase; pattern established in block-editor.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | current | Icons (drag handles) | Already in codebase; drag indicators, status icons |
| @hookform/resolvers | current | Zod + RHF integration | Already in codebase; zodResolver in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dnd-kit | Pragmatic Drag and Drop | New Atlassian library; less React-specific documentation, smaller ecosystem |
| dnd-kit | React DnD | Older, more complex API; dnd-kit is lighter and more accessible |
| dnd-kit | Native HTML5 DnD | Poor touch support, harder to customize animations |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Note:** react-hook-form, zod, nanoid, and lucide-react already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/components/lineups/
├── lineup-editor.tsx           # Main editor component (water vs land modes)
├── water-lineup-builder.tsx    # Boat seat assignment (drag-drop)
├── land-lineup-builder.tsx     # Group assignment (simpler)
├── athlete-roster-panel.tsx    # Source list of athletes (draggable)
├── seat-slot.tsx               # Drop target for individual seats
├── boat-selector.tsx           # Filtered boat dropdown
├── lineup-template-picker.tsx  # Quick-fill from saved templates
└── position-labels.ts          # Rowing position terminology constants
```

### Pattern 1: Dual-Mode Lineup Editor
**What:** Single editor component that switches behavior based on block type (water vs land/erg)
**When to use:** Water blocks require seat positions, land/erg blocks use simple group assignment
**Example:**
```typescript
// Matches existing pattern: practice-form.tsx with BlockEditor
interface LineupEditorProps {
  block: PracticeBlock;
  onLineupChange: (lineup: Lineup) => void;
}

export function LineupEditor({ block, onLineupChange }: LineupEditorProps) {
  if (block.type === 'WATER') {
    return <WaterLineupBuilder block={block} onChange={onLineupChange} />;
  }
  return <LandLineupBuilder block={block} onChange={onLineupChange} />;
}
```

### Pattern 2: DndKit Multi-Container Sortable
**What:** Roster panel as source container, seat slots as drop containers, drag between them
**When to use:** Water lineup with fixed seat positions
**Example:**
```typescript
// Source: https://docs.dndkit.com/presets/sortable/sortable-context
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export function WaterLineupBuilder() {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Roster container
  const rosterIds = athletes.map(a => a.id);

  // Seat containers (one per seat)
  const seatAssignments = { /* seat1: athleteId, ... */ };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={rosterIds} strategy={verticalListSortingStrategy}>
        <AthleteRosterPanel athletes={athletes} />
      </SortableContext>

      <div className="boat-layout">
        {seats.map(seat => (
          <SeatSlot
            key={seat.position}
            seat={seat}
            athleteId={seatAssignments[seat.position]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId ? <AthleteCard athleteId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Pattern 3: React Hook Form useFieldArray for Dynamic Lineups
**What:** Manage multiple lineup entries (one per block) with validation
**When to use:** Practice has multiple blocks, each with own lineup
**Example:**
```typescript
// Source: https://react-hook-form.com/docs/usefieldarray
import { useFieldArray, useForm } from 'react-hook-form';

export function PracticeLineupForm() {
  const { control } = useForm();
  const { fields, append, update } = useFieldArray({
    control,
    name: 'lineups',
  });

  // Each block gets a lineup entry
  // Use field.id (not index) as key to prevent re-render issues
  return (
    <>
      {fields.map((field, index) => (
        <LineupEditor
          key={field.id}  // IMPORTANT: use field.id, not index
          blockId={blocks[index].id}
          lineup={field}
          onUpdate={(lineup) => update(index, lineup)}
        />
      ))}
    </>
  );
}
```

### Pattern 4: Equipment Compatibility as Filter-First
**What:** Hide incompatible boats, show warnings for edge cases
**When to use:** Boat selection for water lineups
**Example:**
```typescript
// Match existing pattern: equipment validation in schema
function getCompatibleBoats(lineupSize: number, practice: Practice) {
  return boats.filter(boat => {
    // Hard filters (never show)
    if (boat.boatClass !== getClassForSize(lineupSize)) return false;
    if (!boat.available) return false; // damaged or manual unavailable

    // Soft filters (show warning, allow override)
    // Double booking check happens in UI, not filter
    return true;
  });
}

// Validation schema using Zod refine
const lineupSchema = z.object({
  blockId: z.string().uuid(),
  boatId: z.string().uuid().optional(),
  seats: z.array(seatSchema),
}).refine(
  (data) => {
    // Boat size matches seat count
    if (!data.boatId) return true;
    const boat = getBoat(data.boatId);
    return boat.capacity === data.seats.filter(s => s.athleteId).length;
  },
  { message: 'Boat size must match number of assigned athletes' }
);
```

### Pattern 5: Template Copy-On-Apply
**What:** Applying template creates independent lineup copy, no ongoing link
**When to use:** Quick-fill from saved lineup template
**Example:**
```typescript
// Matches existing pattern: PracticeTemplate -> Practice
async function applyLineupTemplate(templateId: string, blockId: string) {
  const template = await fetchLineupTemplate(templateId);

  // Deep copy, no foreign key to template
  const newLineup = {
    blockId,
    boatId: template.defaultBoatId,
    seats: template.seats.map(s => ({
      position: s.position,
      athleteId: s.defaultAthleteId, // Coach can override after apply
      side: s.side,
    })),
  };

  return newLineup;
}
```

### Pattern 6: TempId for Unsaved Lineups
**What:** Use nanoid() once when creating lineup object, stable across re-renders
**When to use:** Managing unsaved lineup state before API persistence
**Example:**
```typescript
// Source: Existing block-editor.tsx pattern
import { nanoid } from 'nanoid';

interface Lineup {
  id?: string;      // Server ID after save
  tempId?: string;  // Client ID before save
  blockId: string;
  seats: Seat[];
}

function createNewLineup(blockId: string): Lineup {
  return {
    tempId: nanoid(), // Generated ONCE, not on every render
    blockId,
    seats: [],
  };
}

// Use stable ID for React keys
lineups.map(lineup => (
  <LineupEditor key={lineup.id || lineup.tempId} lineup={lineup} />
))
```

### Anti-Patterns to Avoid
- **Don't call nanoid() during render** - Generate tempId once when object is created, not on every render (causes key instability)
- **Don't use index as useFieldArray key** - Use field.id provided by useFieldArray to prevent re-render bugs
- **Don't validate incompatible boats in UI warnings** - Hide them entirely from selection (filter at data level)
- **Don't allow swapping athletes between blocks via drag** - Scope drag-drop to single block/lineup (prevent accidental cross-block moves)
- **Don't use SortableContext for seat slots** - Seats have fixed positions; use droppable areas, not sortable lists

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop | Custom onMouseDown/onTouchStart handlers | @dnd-kit/core | Touch support, accessibility (keyboard), collision detection, auto-scroll all solved |
| Sortable lists | Manual index reordering | @dnd-kit/sortable | Handles animations, multi-container, accessibility, edge cases (empty lists, single item) |
| Dynamic form arrays | Manual array state + splice/push | useFieldArray from react-hook-form | Unique IDs for keys, proper validation, performance optimizations, undo/redo support |
| Complex validation rules | Manual if/else chains | Zod .refine() and .superRefine() | Type-safe, composable, clear error paths, integrates with react-hook-form |
| Unique IDs for unsaved records | Math.random() or timestamp | nanoid | Collision-resistant, URL-safe, compact (21 chars default), 118 bytes |
| Equipment conflict detection | Manual datetime overlap checks | Interval overlap algorithm | Edge cases (same start/end, timezone, DST) already solved |

**Key insight:** Drag-and-drop is deceptively complex. Touch devices, keyboard navigation, screen readers, animations, collision detection, and auto-scrolling have subtle edge cases. dnd-kit solves these with ~10KB bundle size vs 100+ lines of custom code that breaks on iPad.

## Common Pitfalls

### Pitfall 1: Using Index as Key in Dynamic Lists
**What goes wrong:** When athlete list re-renders, React loses track of which component is which, causing wrong values in inputs, animation glitches, and focus loss
**Why it happens:** Developers use `athletes.map((a, index) => <div key={index}>)` because it's simple
**How to avoid:** Always use stable unique IDs - `athlete.id` for saved records, `athlete.tempId` for unsaved
**Warning signs:** Input values "jumping" between fields when reordering, drag animations looking wrong

### Pitfall 2: Rendering DragOverlay with Same useSortable Component
**What goes wrong:** ID collision causes drag to break - the dragged item appears in both roster and overlay simultaneously
**Why it happens:** DragOverlay needs to show the dragged item, but rendering the same component that calls `useSortable(id)` creates duplicate IDs
**How to avoid:** Extract a presentation component (`<AthleteCard>`) that doesn't use hooks, render that in overlay
**Warning signs:** Console errors about duplicate IDs, drag preview looks wrong or disappears
**Source:** https://docs.dndkit.com/presets/sortable (common pitfall section)

### Pitfall 3: Not Handling "Remove From Old Position" on Seat Assignment
**What goes wrong:** Athlete appears in two seats simultaneously, or drag fails because source isn't cleared
**Why it happens:** On drop, only setting `seats[newPosition] = athleteId` without clearing old position
**How to avoid:** In `onDragEnd`, first find and clear any existing assignment of this athlete, then assign to new position
**Warning signs:** Duplicate athletes, UI desync from state, validation errors about athlete being in multiple positions

### Pitfall 4: Validating Boat Compatibility Too Late
**What goes wrong:** Coach selects boat, assigns 8 athletes, discovers boat is a 4+ after lineup is complete
**Why it happens:** Showing all boats in dropdown, validating size on submit
**How to avoid:** Filter boat list by seat count BEFORE displaying - only show boats matching lineup size
**Warning signs:** Frequent validation errors on submit, coaches complaining about workflow

### Pitfall 5: Not Using sortableKeyboardCoordinates for Accessibility
**What goes wrong:** Keyboard users can't reorder lineup using arrow keys, failing WCAG compliance
**Why it happens:** Default dnd-kit keyboard sensor moves by pixels, not list positions
**How to avoid:** Import and pass `sortableKeyboardCoordinates` to KeyboardSensor
**Warning signs:** Tab navigation works but arrow keys don't move items logically
**Example:**
```typescript
import { KeyboardSensor, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates, // CRITICAL for sortable lists
  })
);
```
**Source:** https://docs.dndkit.com/presets/sortable

### Pitfall 6: Forgetting Port/Starboard Side in Sweep Boats
**What goes wrong:** Coach assigns 8 athletes to sweep eight but can't see who's port vs starboard, lineup is unbalanced
**Why it happens:** Assuming all seats are equal, not modeling side preference in UI
**How to avoid:** For sweep boats (2-, 4-, 8+), alternate or explicitly mark seats as port/starboard, optionally highlight athletes with matching sidePreference
**Warning signs:** Coaches manually tracking sides in external notes, lineup errors discovered on dock

### Pitfall 7: Allowing Ineligible Athletes in Lineups
**What goes wrong:** Athlete without current season eligibility gets assigned, later discovered at regatta (compliance issue)
**Why it happens:** Roster panel shows all athletes regardless of eligibility status
**How to avoid:** Filter roster by `AthleteEligibility.isEligible` for current season, or show but disable/visually distinguish
**Warning signs:** Coaches asking "why is [graduated athlete] still showing up?", eligibility discussions during practice planning

### Pitfall 8: Double Booking Detection Only on Submit
**What goes wrong:** Coach plans entire practice, assigns boats, hits save, discovers boat is already assigned to overlapping practice
**Why it happens:** Conflict detection only runs server-side on create/update
**How to avoid:** Check for overlaps when boat is selected (client-side), show non-blocking warning, allow override
**Warning signs:** Frustrated coaches re-planning after validation errors, lack of flexibility for intentional double-booking (split squad)

## Code Examples

Verified patterns from official sources:

### DndKit Setup with Multiple Containers
```typescript
// Source: https://docs.dndkit.com/presets/sortable/sortable-context
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function WaterLineupBuilder({ athletes, seats, lineup, onChange }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    // Check if dropping on a seat
    if (over.id.startsWith('seat-')) {
      const seatPosition = parseInt(over.id.replace('seat-', ''));

      // Remove athlete from old position if assigned
      const updatedSeats = lineup.seats.map(s =>
        s.athleteId === active.id ? { ...s, athleteId: null } : s
      );

      // Assign to new position
      updatedSeats[seatPosition - 1] = {
        ...updatedSeats[seatPosition - 1],
        athleteId: active.id as string,
      };

      onChange({ ...lineup, seats: updatedSeats });
    }

    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      {/* Roster panel */}
      <SortableContext items={athletes.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <AthleteRosterPanel athletes={athletes} />
      </SortableContext>

      {/* Seat layout */}
      <div className="seats">
        {seats.map((seat, idx) => (
          <SeatSlot
            key={seat.position}
            id={`seat-${seat.position}`}
            seat={seat}
            athleteId={lineup.seats[idx]?.athleteId}
          />
        ))}
      </div>

      {/* Drag overlay - presentation only, no hooks */}
      <DragOverlay>
        {activeId ? <AthleteCardPresentation athleteId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Droppable Seat Slot Component
```typescript
// Source: https://docs.dndkit.com/api-documentation/droppable
import { useDroppable } from '@dnd-kit/core';

interface SeatSlotProps {
  id: string;
  seat: Seat;
  athleteId: string | null;
}

export function SeatSlot({ id, seat, athleteId }: SeatSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        seat-slot
        ${isOver ? 'bg-emerald-500/20' : 'bg-zinc-800'}
        ${seat.side === 'PORT' ? 'border-l-blue-500' : ''}
        ${seat.side === 'STARBOARD' ? 'border-l-green-500' : ''}
      `}
    >
      <div className="seat-label">{seat.label}</div>
      {athleteId ? (
        <AssignedAthleteChip athleteId={athleteId} />
      ) : (
        <div className="empty-seat">Empty</div>
      )}
    </div>
  );
}
```

### Draggable Athlete in Roster
```typescript
// Source: https://docs.dndkit.com/presets/sortable/usesortable
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableAthleteProps {
  athlete: Athlete;
}

export function DraggableAthlete({ athlete }: DraggableAthleteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: athlete.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AthleteCard athlete={athlete} />
    </div>
  );
}
```

### Zod Schema for Lineup Validation
```typescript
// Source: https://zod.dev/api (refinements)
import { z } from 'zod';

const seatSchema = z.object({
  position: z.number().int().min(1).max(9),
  label: z.string(), // "Bow", "2", ..., "Stroke", "Cox"
  side: z.enum(['PORT', 'STARBOARD', 'NONE']).optional(),
  athleteId: z.string().uuid().nullable(),
});

const lineupSchema = z.object({
  id: z.string().uuid().optional(),
  tempId: z.string().optional(),
  blockId: z.string().uuid(),
  boatId: z.string().uuid().optional(),
  seats: z.array(seatSchema),
}).refine(
  (data) => {
    // If boat assigned, verify size matches
    if (!data.boatId) return true;
    const assignedCount = data.seats.filter(s => s.athleteId).length;
    const boat = getBoat(data.boatId);
    return assignedCount === 0 || assignedCount === boat.capacity;
  },
  { message: 'Assigned athletes must match boat capacity', path: ['boatId'] }
).superRefine((data, ctx) => {
  // Check for duplicate athlete assignments
  const athleteIds = data.seats
    .map(s => s.athleteId)
    .filter((id): id is string => id !== null);

  const duplicates = athleteIds.filter((id, idx) => athleteIds.indexOf(id) !== idx);

  if (duplicates.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Athlete assigned to multiple seats: ${duplicates.join(', ')}`,
      path: ['seats'],
    });
  }
});

export type Lineup = z.infer<typeof lineupSchema>;
export type Seat = z.infer<typeof seatSchema>;
```

### Rowing Position Constants
```typescript
// Domain knowledge: standard rowing terminology
export const ROWING_POSITIONS = {
  SINGLE_1X: [
    { position: 1, label: 'Sculler', side: 'NONE' },
  ],
  DOUBLE_2X: [
    { position: 1, label: 'Bow', side: 'NONE' },
    { position: 2, label: 'Stroke', side: 'NONE' },
  ],
  PAIR_2_MINUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: 'Stroke', side: 'STARBOARD' },
  ],
  EIGHT_8_PLUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: '2', side: 'STARBOARD' },
    { position: 3, label: '3', side: 'PORT' },
    { position: 4, label: '4', side: 'STARBOARD' },
    { position: 5, label: '5', side: 'PORT' },
    { position: 6, label: '6', side: 'STARBOARD' },
    { position: 7, label: '7', side: 'PORT' },
    { position: 8, label: 'Stroke', side: 'STARBOARD' },
    { position: 9, label: 'Cox', side: 'NONE' },
  ],
  // ... other boat classes
} as const;

export function getSeatsForBoatClass(boatClass: BoatClass): Seat[] {
  const template = ROWING_POSITIONS[boatClass];
  return template.map(t => ({
    ...t,
    athleteId: null,
  }));
}
```

### Equipment Double-Booking Warning (Non-Blocking)
```typescript
// Client-side check, allows override
function checkBoatConflicts(
  boatId: string,
  practiceStart: Date,
  practiceEnd: Date
): { hasConflict: boolean; conflictingPractice?: Practice } {
  // Query practices overlapping with this time range
  const overlapping = practices.filter(p =>
    p.id !== currentPracticeId &&
    p.blocks.some(b =>
      b.lineup?.boatId === boatId &&
      intervalsOverlap(
        { start: practiceStart, end: practiceEnd },
        { start: p.startTime, end: p.endTime }
      )
    )
  );

  return {
    hasConflict: overlapping.length > 0,
    conflictingPractice: overlapping[0],
  };
}

// In boat selector component
const conflict = checkBoatConflicts(selectedBoat.id, practice.startTime, practice.endTime);

{conflict.hasConflict && (
  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
    ⚠️ This boat is assigned to "{conflict.conflictingPractice.name}" at the same time.
    You can still assign it if this is intentional (split squad).
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | dnd-kit or pragmatic-drag-and-drop | 2022-2024 | Atlassian archived rbd; dnd-kit became standard with 5.3M weekly downloads vs 1.9M for rbd |
| Manual drag handlers | @dnd-kit/core | 2020-2026 | Accessibility, touch support, collision detection now expected; hand-rolling breaks on screen readers |
| Yup validation | Zod | 2021-2026 | Type inference, composition, smaller bundle; React Hook Form + Zod is 2026 default stack |
| useState for form arrays | useFieldArray | 2019-2026 | RHF's useFieldArray handles keys, validation, performance; manual state causes re-render issues |
| uuid v4 | nanoid | 2018-2026 | Smaller (118 bytes vs 4.5KB), faster, URL-safe; became standard for client-side IDs |

**Deprecated/outdated:**
- react-beautiful-dnd: Archived by Atlassian in 2022, use dnd-kit or pragmatic-drag-and-drop instead
- react-dnd: Still maintained but dnd-kit has better DX, accessibility, and bundle size for sortable lists
- Formik: Still works but React Hook Form + Zod is lighter, faster, better TypeScript integration

**Current as of 2026:**
- dnd-kit is actively maintained, last release Nov 2024
- React Hook Form 7.71.1 (Dec 2024) is current, v8 not yet released
- Zod 4.3.5 is latest, mature and stable

## Open Questions

Things that couldn't be fully resolved:

1. **Port/Starboard Visual Distinction for Scull vs Sweep**
   - What we know: Sweep boats (2-, 4-, 8+) have fixed port/starboard sides per seat; scull boats (1x, 2x, 4x) do not
   - What's unclear: Whether to show side indicators for sculling boats, or only sweep boats
   - Recommendation: Check boatClass - if boat name includes "X" (scull), hide side indicators; if "-" or "+" (sweep), show port/starboard. Verify with coach during testing.

2. **Oar Assignment Scope**
   - What we know: CONTEXT.md defers oar assignment decision to Claude's discretion
   - What's unclear: Whether oars should be assigned per-lineup, per-boat, or tracked separately as equipment usage
   - Recommendation: Defer to Phase 3 planning. Oar assignment adds complexity (matching boat class, tracking sets). Start without oar assignment, add in future phase if coaches request. Equipment usage logging (EQUIP-01) covers boat assignment already.

3. **Athlete Info Display Richness**
   - What we know: Options include hover tooltips, always-visible details, or minimal (name only)
   - What's unclear: What info coaches need at a glance (side preference? eligibility status? recent attendance?)
   - Recommendation: Start minimal (displayName + sidePreference icon), iterate based on coach feedback. Avoid tooltip-only info (bad for touch devices).

4. **Land/Erg Block Capacity Limits**
   - What we know: CONTEXT.md says "show count of assigned vs available, no hard limit"
   - What's unclear: What "available" means - ergs are countable equipment, land workouts may not have physical constraints
   - Recommendation: For erg blocks, count equipment (Equipment.type = ERG). For land blocks, no capacity check. Allow coach to set optional capacity in block notes if needed.

5. **Cross-Block Athlete Assignment Validation**
   - What we know: Athletes CAN be assigned to multiple blocks in same practice (CONTEXT.md decision)
   - What's unclear: Should UI warn if athlete is in two water blocks simultaneously (can't be in two boats at once)?
   - Recommendation: No validation - blocks are sequential (position-based), not time-slotted. If blocks overlap in real time, that's a practice scheduling issue, not a lineup issue.

## Sources

### Primary (HIGH confidence)
- dnd-kit documentation: https://docs.dndkit.com - Core API, sortable preset, accessibility
- React Hook Form documentation: https://react-hook-form.com/docs/usefieldarray - useFieldArray API, dynamic forms
- Zod GitHub discussions: https://github.com/colinhacks/zod/discussions/938, /2099 - Conditional validation patterns
- US Rowing terminology: https://usrowing.org/learn-about-rowing/terminology - Official position names, side designations
- World Rowing Defining Series: https://worldrowing.com (port/starboard, sweep/scull) - Authoritative rowing terminology

### Secondary (MEDIUM confidence)
- Puck Blog: [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Library comparison, deprecation status
- npm trends: [dnd-kit vs react-beautiful-dnd](https://npmtrends.com/@dnd-kit/core-vs-react-beautiful-dnd-vs-react-dnd) - Download statistics, adoption trends
- LogRocket: [Build Kanban board with dnd-kit](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - Multi-container pattern examples
- Refine Blog: [Dynamic Forms with React Hook Form](https://refine.dev/blog/dynamic-forms-in-react-hook-form/) - useFieldArray best practices
- Better Stack: [Complete Guide to Zod](https://betterstack.com/community/guides/scaling-nodejs/zod-explained/) - Refinement patterns, superRefine usage

### Secondary (MEDIUM confidence - Sports Management)
- Demosphere: [Roster Management Features](https://demosphere.com/features/roster-management/) - Drag-drop roster assignment, filtering patterns
- SportsEngine HQ: [Season Management - Rostering](https://help.sportsengine.com/en/articles/6345009-season-management-rostering) - Search, filter, roster status patterns
- Schedise: [Double Booking Prevention](https://www.schedise.com/double-booking-prevention) - Conflict detection algorithms, warning UX

### Secondary (MEDIUM confidence - Validation & State)
- Nucamp: [State Management in 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - React Query, Zustand, Immer patterns
- Material UI: [React Alert component](https://mui.com/material-ui/react-alert/) - Non-blocking warning patterns
- GitHub issue: [React Hook Form warnings vs errors](https://github.com/react-hook-form/react-hook-form/issues/1761) - Non-blocking validation discussion

### Tertiary (LOW confidence - flagged for validation)
- nanoid React key usage: Warning from BBC Simorgh issue (#1489) about not using nanoid for keys during render - Validated by generating once when object created, not during render cycle

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dnd-kit documented, verified downloads; RHF + Zod already in codebase; nanoid pattern exists in block-editor.tsx
- Architecture: HIGH - dnd-kit patterns from official docs; useFieldArray patterns from RHF docs; Zod refinements verified
- Rowing terminology: HIGH - US Rowing and World Rowing official sources for position names and side designations
- Pitfalls: MEDIUM - dnd-kit common issues documented; key/index pitfall is well-known React pattern; double-booking from sports management research
- Equipment compatibility: MEDIUM - Filter-first pattern inferred from user decisions (auto-filter, hide unavailable); double-booking warning pattern from scheduling research

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - dnd-kit and React Hook Form are stable, rowing terminology timeless)

**Research notes:**
- Existing codebase patterns heavily inform approach (block-editor.tsx, practice-form.tsx, equipment validation)
- User decisions from CONTEXT.md constrain research: drag-drop confirmed, traditional rowing terms required, boat filtering decided
- No framework changes needed - all libraries compatible with existing Next.js 15, React 19, TypeScript stack
- dnd-kit installation required (not currently in package.json)
