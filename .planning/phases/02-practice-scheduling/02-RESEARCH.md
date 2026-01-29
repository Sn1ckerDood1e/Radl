# Phase 2: Practice Scheduling - Research

**Researched:** 2026-01-21
**Domain:** Practice management, calendar UI, equipment readiness, template systems
**Confidence:** HIGH

## Summary

Phase 2 builds practice scheduling on top of the existing Season model from Phase 1. The core challenge is modeling practices with ordered blocks, implementing a draft/published workflow, creating a reusable template system, and deriving equipment readiness from existing damage reports.

The existing codebase establishes clear patterns: Prisma models with teamId for multi-tenancy, Zod validation schemas with separate form/API versions, react-hook-form for forms, and a consistent API route structure using `getClaimsForApiRoute()`. This phase extends these patterns for practices, blocks, and templates.

For the calendar view, two viable approaches exist: (1) build a custom calendar using shadcn Calendar blocks with react-day-picker, or (2) use react-big-calendar for a full Google Calendar-like experience. Given the requirements for minimal practice cards (time + name only) and a unified view, a custom approach using shadcn blocks provides better control and consistency with the existing dark-themed UI.

**Primary recommendation:** Use existing codebase patterns with Prisma for Practice/Block/Template models, derive equipment readiness at query time from DamageReport status, and build a custom calendar component using shadcn/react-day-picker for the unified view.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.0.0 | Data models and queries | Already used for all models |
| Zod | 4.3.5 | Request validation | Already used for all API validation |
| react-hook-form | 7.71.1 | Form state management | Already used for equipment, invitations |
| Tailwind CSS | 4.x | Styling | Already used throughout |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | 9.x | Calendar foundation | Base component for calendar views |
| date-fns | 3.x | Date formatting/manipulation | Required by react-day-picker, calendar logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-day-picker + custom | react-big-calendar | react-big-calendar provides month/week/day views but requires more styling work to match dark theme, less control over card display |
| react-day-picker + custom | FullCalendar | Overkill for minimal cards, premium features not needed, harder to customize |
| Custom calendar | shadcn Calendar blocks | shadcn blocks are built on react-day-picker, provide good starting point |

**Installation:**
```bash
npm install react-day-picker date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (dashboard)/
│       └── [teamSlug]/
│           ├── schedule/                    # Calendar view (practices + regattas)
│           │   └── page.tsx
│           ├── practices/
│           │   ├── page.tsx                 # Practices list (optional, may use schedule only)
│           │   ├── new/
│           │   │   └── page.tsx             # Create practice
│           │   └── [id]/
│           │       ├── page.tsx             # Practice detail/edit
│           │       └── edit/
│           │           └── page.tsx
│           └── templates/
│               ├── page.tsx                 # Template management
│               └── [id]/
│                   └── page.tsx
│   └── api/
│       ├── practices/
│       │   ├── route.ts                     # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts                 # GET, PATCH, DELETE
│       │       └── publish/
│       │           └── route.ts             # POST (publish practice)
│       ├── practice-templates/
│       │   ├── route.ts                     # GET, POST
│       │   ├── [id]/
│       │   │   └── route.ts                 # GET, PATCH, DELETE
│       │   └── apply/
│       │       └── route.ts                 # POST (apply template to create practice)
│       └── block-templates/
│           ├── route.ts                     # GET, POST
│           └── [id]/
│               └── route.ts                 # GET, PATCH, DELETE
├── components/
│   ├── calendar/
│   │   ├── unified-calendar.tsx             # Main calendar component
│   │   ├── calendar-day.tsx                 # Day cell with events
│   │   ├── practice-card.tsx                # Minimal practice card (time + name)
│   │   └── regatta-card.tsx                 # Regatta placeholder card
│   ├── practices/
│   │   ├── practice-form.tsx                # Create/edit practice
│   │   ├── block-editor.tsx                 # Block sequence editor
│   │   └── block-card.tsx                   # Individual block display
│   └── templates/
│       ├── template-picker.tsx              # Select and apply templates
│       └── template-form.tsx                # Create/edit template
└── lib/
    └── validations/
        ├── practice.ts                      # Practice and block schemas
        └── template.ts                      # Template schemas
```

### Pattern 1: Draft/Published Workflow with Status Enum
**What:** Use a status enum (DRAFT, PUBLISHED) instead of boolean for extensibility
**When to use:** Any content that has visibility states or may add states later (CANCELLED, ARCHIVED)
**Example:**
```typescript
// prisma/schema.prisma
enum PracticeStatus {
  DRAFT      // Only visible to coaches
  PUBLISHED  // Visible to all team members
}

model Practice {
  id        String         @id @default(uuid())
  teamId    String
  seasonId  String
  name      String
  date      DateTime
  startTime DateTime
  endTime   DateTime
  status    PracticeStatus @default(DRAFT)
  // ...
}
```

Source: [bojanv.dev - Use enums over booleans](https://bojanv.dev/posts/use-enums-over-booleans/)

### Pattern 2: Ordered Blocks with Position Field
**What:** Use an explicit `position` integer field for maintaining block order
**When to use:** Any ordered collection where sequence matters (blocks, lineup seats)
**Example:**
```typescript
// prisma/schema.prisma
model PracticeBlock {
  id         String    @id @default(uuid())
  practiceId String
  position   Int       // 0, 1, 2... for ordering
  type       BlockType
  // ...

  practice Practice @relation(fields: [practiceId], references: [id], onDelete: Cascade)

  @@index([practiceId, position])
}

// Query blocks in order
const practice = await prisma.practice.findUnique({
  where: { id },
  include: {
    blocks: {
      orderBy: { position: 'asc' }
    }
  }
});
```

Source: [Prisma Docs - Filtering and Sorting](https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting)

### Pattern 3: Template as Snapshot (Copy on Apply)
**What:** Templates store structure, applying creates independent copy of data
**When to use:** Reusable templates where original and copies should evolve independently
**Example:**
```typescript
// Apply practice template to create a new practice
async function applyPracticeTemplate(templateId: string, date: Date, seasonId: string, teamId: string) {
  const template = await prisma.practiceTemplate.findUnique({
    where: { id: templateId },
    include: { blocks: { orderBy: { position: 'asc' } } }
  });

  // Create practice with copied structure
  return prisma.practice.create({
    data: {
      teamId,
      seasonId,
      name: template.name,
      date,
      startTime: combineDateTime(date, template.defaultStartTime),
      endTime: combineDateTime(date, template.defaultEndTime),
      status: 'DRAFT',
      blocks: {
        create: template.blocks.map((block, index) => ({
          position: index,
          type: block.type,
          durationMinutes: block.durationMinutes,
          category: block.category,
          notes: block.notes,
        }))
      }
    }
  });
}
```

### Pattern 4: Derived Equipment Readiness (Computed, Not Stored)
**What:** Calculate equipment availability at query time from damage reports + manual override
**When to use:** When readiness depends on other data that changes frequently
**Example:**
```typescript
// Extend Equipment model with manual override
model Equipment {
  // ... existing fields
  manualUnavailable     Boolean   @default(false)  // Coach can manually mark unavailable
  manualUnavailableNote String?                    // Reason for manual override
}

// Compute readiness at query time
async function getEquipmentWithReadiness(teamId: string) {
  const equipment = await prisma.equipment.findMany({
    where: { teamId, status: 'ACTIVE' },
    include: {
      damageReports: {
        where: { status: 'OPEN' },
        select: { id: true, description: true }
      }
    }
  });

  return equipment.map(e => ({
    ...e,
    isAvailable: !e.manualUnavailable && e.damageReports.length === 0,
    unavailableReasons: [
      ...(e.manualUnavailable ? [e.manualUnavailableNote || 'Marked unavailable'] : []),
      ...e.damageReports.map(d => `Damage: ${d.description.slice(0, 50)}`)
    ]
  }));
}
```

Source: [stevekinney.com - Derived vs Stored State](https://stevekinney.com/courses/react-performance/derived-vs-stored-state)

### Anti-Patterns to Avoid
- **Storing computed readiness:** Don't add an `isReady` boolean to Equipment that must be kept in sync with damage reports. Derive it at query time.
- **Using arrays for ordered blocks:** Don't rely on insertion order or JSON arrays. Use explicit position field.
- **Single template level:** Don't just have practice templates. Block templates allow more flexible composition.
- **Boolean for status:** Don't use `isDraft: boolean`. Use enum for future-proofing (CANCELLED, ARCHIVED states).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date strings | date-fns `format()` | Locale handling, timezone edge cases |
| Date arithmetic | Manual math | date-fns `addDays()`, `isSameDay()` | Month boundaries, DST transitions |
| Calendar grid | Custom CSS grid | react-day-picker | Accessibility, keyboard navigation, locale support |
| Form validation | Manual if/else | Zod schemas | Type inference, consistent error messages |
| Time input | Custom parsing | HTML `<input type="time">` + date-fns | Browser-native picker, consistent UX |

**Key insight:** Date/time handling has countless edge cases (timezones, DST, leap years, locale formats). date-fns handles these; custom implementations will have bugs.

## Common Pitfalls

### Pitfall 1: Timezone Confusion
**What goes wrong:** Practice shows at wrong time for users in different timezones, or times shift when saving
**Why it happens:** Mixing local times with UTC storage, inconsistent handling across server/client
**How to avoid:**
- Store practice dates in UTC in database
- Always use date-fns-tz or similar for timezone conversion
- Display times in user's local timezone on client
- Pass ISO strings between API and client
**Warning signs:** Times are off by hours, especially near DST transitions

### Pitfall 2: Block Reordering Race Conditions
**What goes wrong:** Drag-and-drop reordering results in duplicate positions or gaps
**Why it happens:** Optimistic updates without proper conflict resolution
**How to avoid:**
- Send full position array to server on reorder: `{ positions: [{ blockId, position }] }`
- Use database transaction to update all positions atomically
- Validate no duplicates and contiguous sequence on server
**Warning signs:** Two blocks with same position, position values like 0, 2, 5 (gaps)

### Pitfall 3: Template Coupling
**What goes wrong:** Editing a template changes existing practices created from it
**Why it happens:** References instead of copies when applying template
**How to avoid:**
- Templates and practices are independent after creation
- "Apply template" creates copies of all data
- Template edits never affect existing practices
**Warning signs:** User edits template, complains past practices changed

### Pitfall 4: Calendar Performance with Many Events
**What goes wrong:** Calendar becomes slow with months of practice data
**Why it happens:** Fetching all events for all visible days, unnecessary re-renders
**How to avoid:**
- Fetch events only for visible month/week range
- Use React.memo for day cells and event cards
- Virtualize if showing list view with many items
**Warning signs:** Lag when switching months, slow initial load

### Pitfall 5: Equipment Conflict False Positives
**What goes wrong:** Showing conflict warnings for practices that don't actually overlap
**Why it happens:** Comparing dates without times, or incorrect overlap logic
**How to avoid:**
- Compare full DateTime values (date + time), not just dates
- Overlap logic: `practice1.end > practice2.start AND practice1.start < practice2.end`
- Consider blocks within practice that use equipment, not whole practice time
**Warning signs:** Conflict shown for morning and afternoon practices on same day

## Code Examples

Verified patterns from official sources and existing codebase:

### Practice API Route (Following Existing Pattern)
```typescript
// src/app/api/practices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPracticeSchema } from '@/lib/validations/practice';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

// GET: List practices for season
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: {
      teamId: string;
      seasonId?: string;
      date?: { gte?: Date; lte?: Date };
      status?: 'DRAFT' | 'PUBLISHED';
    } = {
      teamId: claims.team_id,
    };

    if (seasonId) where.seasonId = seasonId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Athletes only see published practices
    if (claims.user_role !== 'COACH') {
      where.status = 'PUBLISHED';
    }

    const practices = await prisma.practice.findMany({
      where,
      include: {
        blocks: { orderBy: { position: 'asc' } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ practices });
  } catch (error) {
    return serverErrorResponse(error, 'practices:GET');
  }
}
```

### Zod Validation Schema (Following Existing Pattern)
```typescript
// src/lib/validations/practice.ts
import { z } from 'zod';

export const blockTypeSchema = z.enum(['WATER', 'LAND', 'ERG']);

export const createBlockSchema = z.object({
  type: blockTypeSchema,
  durationMinutes: z.number().int().min(5).max(480).optional(),
  category: z.string().max(50).optional(), // e.g., "steady-state", "intervals"
  notes: z.string().max(500).optional(),
});

export const createPracticeSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  blocks: z.array(createBlockSchema).min(1, 'At least one block required'),
}).refine(
  (data) => new Date(data.startTime) < new Date(data.endTime),
  { message: 'End time must be after start time', path: ['endTime'] }
);

export const updatePracticeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export type CreatePracticeInput = z.infer<typeof createPracticeSchema>;
export type UpdatePracticeInput = z.infer<typeof updatePracticeSchema>;
```

### Calendar Component Structure (Using react-day-picker)
```typescript
// src/components/calendar/unified-calendar.tsx
'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import 'react-day-picker/dist/style.css';

interface CalendarEvent {
  id: string;
  type: 'practice' | 'regatta';
  name: string;
  date: Date;
  startTime: Date;
}

interface UnifiedCalendarProps {
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  isCoach: boolean;
}

export function UnifiedCalendar({ events, onDateSelect, isCoach }: UnifiedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter(e => isSameDay(e.date, selectedDate))
    : [];

  // Mark days that have events
  const eventDays = events.map(e => e.date);

  return (
    <div className="flex gap-6">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          if (date) onDateSelect(date);
        }}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        modifiers={{ hasEvent: eventDays }}
        modifiersClassNames={{
          hasEvent: 'bg-emerald-500/20 font-semibold',
        }}
        classNames={{
          // Custom dark theme classes
        }}
      />

      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-4">
          {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
        </h3>
        <div className="space-y-2">
          {selectedDateEvents.map(event => (
            <PracticeCard key={event.id} event={event} isCoach={isCoach} />
          ))}
          {selectedDateEvents.length === 0 && selectedDate && (
            <p className="text-zinc-500">No events scheduled</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Moment.js for dates | date-fns (tree-shakeable) | 2020+ | Smaller bundle, better TypeScript |
| CSS table layouts for calendars | Flexbox/Grid with a11y | 2022+ | Better accessibility, responsive |
| Boolean status flags | Enum status fields | Standard practice | Extensible, clearer semantics |
| Store computed state | Derive at query time | React best practice | Single source of truth |
| react-day-picker v8 | react-day-picker v9 | 2024 | Breaking changes in API, shadcn updated |

**Deprecated/outdated:**
- Moment.js: Large bundle, mutable API. Use date-fns instead.
- react-day-picker v8: shadcn now uses v9 with different API.

## Open Questions

Things that couldn't be fully resolved:

1. **Week View Implementation**
   - What we know: react-day-picker provides month view, can build week navigation
   - What's unclear: Whether to default to week or month view for rowing coaches
   - Recommendation: Start with week view (more relevant for practice planning), allow toggle

2. **Block Duration Representation**
   - What we know: Blocks are ordered, not time-slotted per CONTEXT.md
   - What's unclear: Whether to store duration in minutes or leave implicit
   - Recommendation: Store optional `durationMinutes` for reference, but don't enforce time slots

3. **Template Versioning**
   - What we know: CONTEXT.md marks versioning as Claude's discretion
   - What's unclear: Whether to track template edit history
   - Recommendation: Start simple (in-place edits), no versioning. Template edits don't affect existing practices.

4. **Regatta Placeholder Display**
   - What we know: Phase 5 builds full regatta features, Phase 2 shows placeholders
   - What's unclear: What data structure for regatta placeholders
   - Recommendation: Create minimal Regatta model with name, date, location. Expand in Phase 5.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/home/hb/radl/prisma/schema.prisma`, API routes, components
- [Prisma Docs - Filtering and Sorting](https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting)
- [shadcn/ui Calendar Blocks](https://ui.shadcn.com/blocks/calendar)

### Secondary (MEDIUM confidence)
- [react-big-calendar GitHub](https://github.com/jquense/react-big-calendar) - Verified via WebFetch
- [bojanv.dev - Use enums over booleans](https://bojanv.dev/posts/use-enums-over-booleans/) - Verified pattern
- [Builder.io - Best React Calendar Libraries](https://www.builder.io/blog/best-react-calendar-component-ai) - WebSearch 2026

### Tertiary (LOW confidence)
- Calendar library popularity rankings from WebSearch - validate current npm downloads

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Extends existing patterns, minimal new dependencies
- Architecture: HIGH - Follows established codebase patterns exactly
- Data model: HIGH - Prisma patterns well-documented, multi-tenant pattern already established
- Calendar approach: MEDIUM - Custom build recommended but react-big-calendar viable alternative
- Pitfalls: MEDIUM - Based on common patterns, not rowing-specific validation

**Research date:** 2026-01-21
**Valid until:** 30 days (stable domain, libraries well-established)
