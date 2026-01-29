# Phase 29: Practice Flow Testing - Research

**Researched:** 2026-01-29
**Domain:** Practice management, lineup building, calendar UI
**Confidence:** HIGH (code audit of existing implementation)

## Summary

This phase tests the complete practice flow: creating practices, adding blocks, building lineups via drag-drop, publishing, and athlete visibility. The implementation is mature and comprehensive.

The current codebase has a solid foundation with all core functionality implemented. Key areas for testing include:
1. Practice creation flow via bulk-create page (primary entry point)
2. Block management with @dnd-kit sortable lists
3. Multi-boat lineup building with drag-drop athlete assignment
4. Practice publishing and athlete visibility
5. Calendar view readability

**Primary finding:** All PRAC requirements have working implementations. Testing should focus on verifying happy paths and edge cases, not building new features.

## Current Implementation

### File Inventory

**Pages:**
| File | Purpose |
|------|---------|
| `/src/app/(dashboard)/[teamSlug]/practices/page.tsx` | List/calendar view (dual mode) |
| `/src/app/(dashboard)/[teamSlug]/practices/new/page.tsx` | Redirects to bulk-create |
| `/src/app/(dashboard)/[teamSlug]/practices/bulk-create/page.tsx` | Primary practice creation |
| `/src/app/(dashboard)/[teamSlug]/practices/[id]/page.tsx` | Practice detail (server) |
| `/src/app/(dashboard)/[teamSlug]/practices/[id]/inline-practice-page.tsx` | Inline editing UI |
| `/src/app/(dashboard)/[teamSlug]/practices/[id]/practice-detail-client.tsx` | Legacy detail client |

**Components:**
| File | Purpose |
|------|---------|
| `/src/components/practices/bulk-practice-creator.tsx` | Multi-practice creation form |
| `/src/components/practices/practice-form.tsx` | Single practice form |
| `/src/components/practices/block-editor.tsx` | Block type selector + management |
| `/src/components/practices/sortable-block-list.tsx` | @dnd-kit block reordering |
| `/src/components/practices/inline-block-editor.tsx` | Inline block editing |
| `/src/components/practices/block-type-buttons.tsx` | Add block buttons |
| `/src/components/practices/practice-lineups-section.tsx` | Water block lineups |
| `/src/components/practices/water-block-summary.tsx` | Boat assignment summary |
| `/src/components/practices/erg-block-content.tsx` | Erg workout builder |
| `/src/components/calendar/unified-calendar.tsx` | Full calendar with react-day-picker |
| `/src/components/calendar/practice-card.tsx` | Practice card for calendar |
| `/src/components/dashboard/next-practice-widget.tsx` | Athlete's next practice hero |

**Lineup Components:**
| File | Purpose |
|------|---------|
| `/src/components/lineups/multi-boat-lineup-builder.tsx` | Multi-boat drag-drop editor |
| `/src/components/lineups/water-lineup-builder.tsx` | Single boat lineup editor |
| `/src/components/lineups/athlete-roster-panel.tsx` | Draggable athlete list |
| `/src/components/lineups/seat-slot.tsx` | Droppable seat target |
| `/src/components/lineups/athlete-card.tsx` | Presentational athlete card |
| `/src/components/lineups/draggable-athlete.tsx` | Athlete with drag hooks |
| `/src/components/lineups/boat-lineup-card.tsx` | Single boat lineup display |
| `/src/components/lineups/boat-selector.tsx` | Boat picker for lineups |

**API Routes:**
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/practices` | GET, POST | List/create practices |
| `/api/practices/[id]` | GET, PATCH, DELETE | Single practice CRUD |
| `/api/practices/[id]/publish` | POST | Publish practice |
| `/api/practices/[id]/blocks` | POST, DELETE | Add/remove blocks |
| `/api/practices/[id]/blocks/[blockId]` | PATCH, DELETE | Update/delete block |
| `/api/practices/[id]/blocks/[blockId]/lineups` | GET, PUT | Bulk lineup save |
| `/api/practices/[id]/blocks/reorder` | POST | Reorder blocks |

### Data Model

```
Practice
  - id, teamId, seasonId, name
  - date, startTime, endTime
  - status: DRAFT | PUBLISHED
  - notes
  - blocks: PracticeBlock[]

PracticeBlock
  - id, practiceId, position
  - type: WATER | ERG | LAND | MEETING
  - title, durationMinutes, category, notes
  - lineup: Lineup[] (for WATER)
  - workout: Workout (for ERG)
  - landAssignments: LandAssignment[] (for LAND/ERG)

Lineup
  - id, blockId, boatId
  - seats: SeatAssignment[]

SeatAssignment
  - lineupId, athleteId, position, side
```

## Per-Requirement Assessment

### PRAC-01: Create practice with date, time, location

**Implementation status:** COMPLETE (except location)

**What exists:**
- Bulk practice creator at `/practices/bulk-create`
- Practice form with name, date, start time, end time, notes
- Season selector (required)
- Template picker for quick setup

**Gap identified:** Location field is NOT in the Practice schema or form. The requirements mention "location" but the current schema only has:
- `date`, `startTime`, `endTime`, `notes`

**Testing approach:**
1. Navigate to bulk-create page
2. Select season, enter name, pick date/times
3. Verify practice creates in DRAFT status
4. Verify practice appears in list and calendar

### PRAC-02: Add blocks to practice

**Implementation status:** COMPLETE

**What exists:**
- Block types: WATER, ERG, LAND, MEETING
- BlockTypeButtons component for adding
- SortableBlockList with @dnd-kit
- Drag-drop reordering works
- Inline editing for block fields

**Code evidence:**
```typescript
// block-type-buttons.tsx - all 4 types available
const blockTypes = [
  { value: 'WATER', label: 'Water' },
  { value: 'LAND', label: 'Land' },
  { value: 'ERG', label: 'Erg' },
  { value: 'MEETING', label: 'Meeting' },
];
```

**Testing approach:**
1. Open practice detail page
2. Click block type buttons to add each type
3. Verify blocks render with correct color coding
4. Drag blocks to reorder, verify persistence
5. Delete a block, verify removal

### PRAC-03: Assign athletes to lineup seats via drag-drop

**Implementation status:** COMPLETE

**What exists:**
- MultiBoatLineupBuilder with @dnd-kit
- AthleteRosterPanel with draggable athletes
- SeatSlot as drop targets
- Swap behavior when dropping on occupied seat
- Multi-boat support (multiple lineups per block)

**Code evidence:**
```typescript
// multi-boat-lineup-builder.tsx
sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

**Key features:**
- Activation requires 8px drag distance (prevents accidental)
- Cross-boat swapping supported
- Athletes removed from roster when assigned
- Save button persists to API

**Testing approach:**
1. Create practice with WATER block
2. Open lineups section
3. Add a boat to the block
4. Drag athlete from roster to seat
5. Verify athlete appears in seat
6. Drag another athlete to same seat, verify swap
7. Click Save Lineups, verify persistence after refresh

### PRAC-04: Publish practice and athletes see assignments

**Implementation status:** COMPLETE

**What exists:**
- Publish toggle button on practice detail
- `/api/practices/[id]/publish` endpoint
- Status filter: athletes only see PUBLISHED practices
- NextPracticeWidget for athlete dashboard
- Push notifications on publish (via notifyPracticeChange)

**Code evidence:**
```typescript
// inline-practice-page.tsx
const handleTogglePublish = async () => {
  const newStatus = practice.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  await savePracticeField('status', newStatus);
  // ...
};
```

```typescript
// page.tsx (practice detail)
// Athletes can only view PUBLISHED practices
if (!isCoach && practice.status !== 'PUBLISHED') {
  notFound();
}
```

**Athlete view:**
- NextPracticeWidget shows next assigned practice
- Shows boat name, seat position, seat side
- Practice detail page shows full lineup (read-only)

**Testing approach:**
1. As coach: create practice, add lineups, publish
2. As athlete: verify practice appears in list/calendar
3. As athlete: open practice, verify can see assignment
4. As athlete: verify NextPracticeWidget shows correct info
5. As coach: unpublish, verify athlete loses access

### PRAC-05: Calendar view is easy to read

**Implementation status:** COMPLETE

**What exists:**
- UnifiedCalendar using react-day-picker
- Month navigation with prev/next buttons
- Day selection shows events in sidebar
- Green dot indicators for practice days
- Blue dot/bar for regatta days
- Draft practices show with amber/yellow styling
- Season filter dropdown
- Offline support with IndexedDB caching

**Code evidence:**
```typescript
// unified-calendar.tsx
<DayPicker
  mode="single"
  modifiers={{
    hasEvent: hasEventDates,
    hasRegatta: hasRegattaDates,
    regattaSpanStart: spanStartDates,
    // ...
  }}
/>
```

**Visual elements:**
- Green dot = practice on that day
- Blue dot = single-day regatta
- Blue bar = multi-day regatta spanning
- Amber card = draft practice
- Selected day highlighted in emerald

**Testing approach:**
1. Create multiple practices across different dates
2. Verify green dots appear on correct days
3. Click a day, verify events show in sidebar
4. Navigate months, verify correct events load
5. Check mobile responsiveness
6. Verify draft practices show with amber styling

## Known Issues and Gaps

### Gap 1: Missing Location Field

**Impact:** MEDIUM
**Description:** PRAC-01 mentions "location" but Practice schema has no location field.

**Options:**
1. Add location field to Practice model (requires migration)
2. Clarify requirements - maybe location not needed
3. Use notes field for location (workaround)

**Recommendation:** Clarify with user. Location field may have been descoped or may need adding.

### Gap 2: No Meeting Block Content

**Impact:** LOW
**Description:** MEETING blocks render but have no special content editor.

**Code evidence:**
```typescript
// inline-practice-page.tsx
// LAND and MEETING blocks: simple notes-only for now
return null;
```

**Recommendation:** This is likely intentional - meetings just need notes.

### Gap 3: No Land Assignment UI in Inline View

**Impact:** LOW
**Description:** Land/Erg assignments use older LineupEditor from practice-detail-client.tsx, not shown in inline-practice-page.tsx.

**Recommendation:** May need to verify land assignments work correctly.

## Testing Approach Summary

### Manual Testing Checklist

**PRAC-01: Practice Creation**
- [ ] Navigate to `/{teamSlug}/practices/bulk-create`
- [ ] Select season (required)
- [ ] Enter practice name
- [ ] Pick date using date picker
- [ ] Set start and end times
- [ ] Add notes (optional)
- [ ] Submit form
- [ ] Verify practice appears in list with DRAFT status
- [ ] Verify practice appears on calendar (amber colored)

**PRAC-02: Block Management**
- [ ] Open practice detail page
- [ ] Click "Water" to add water block
- [ ] Click "Erg" to add erg block
- [ ] Click "Land" to add land block
- [ ] Click "Meeting" to add meeting block
- [ ] Verify each block shows correct color
- [ ] Drag blocks to reorder
- [ ] Verify new order persists after refresh
- [ ] Delete a block
- [ ] Verify block removed

**PRAC-03: Lineup Drag-Drop**
- [ ] Open practice with WATER block
- [ ] Scroll to "Lineups" section
- [ ] Click "Add Boat"
- [ ] Select a boat from picker
- [ ] Drag athlete from roster to empty seat
- [ ] Verify athlete appears in seat
- [ ] Drag different athlete to same seat
- [ ] Verify swap occurs (first athlete returns to roster)
- [ ] Add second boat
- [ ] Drag athlete between boats
- [ ] Click "Save Lineups"
- [ ] Refresh page
- [ ] Verify lineups persist

**PRAC-04: Publishing and Athlete View**
- [ ] As COACH: Complete lineups for practice
- [ ] As COACH: Click "Draft" button to toggle to "Published"
- [ ] As COACH: Verify status shows "Published" (green)
- [ ] As ATHLETE: Login as athlete user
- [ ] As ATHLETE: Navigate to practices list
- [ ] As ATHLETE: Verify published practice appears
- [ ] As ATHLETE: Open practice detail
- [ ] As ATHLETE: Verify can see lineup with their assignment
- [ ] As ATHLETE: Verify cannot see draft practices
- [ ] As ATHLETE: Check dashboard NextPracticeWidget

**PRAC-05: Calendar Readability**
- [ ] Open practices page with calendar view
- [ ] Verify current month displays
- [ ] Click prev/next to navigate months
- [ ] Verify green dots on days with practices
- [ ] Click day with practice(s)
- [ ] Verify sidebar shows practice card(s)
- [ ] Click practice card, verify navigates to detail
- [ ] Test on mobile viewport
- [ ] Verify draft practices show amber styling
- [ ] Verify published practices show blue styling

### Edge Cases to Test

1. **Empty states:** No practices, no blocks, no lineups
2. **Large data:** Many practices, many athletes
3. **Concurrent edits:** Two coaches editing same practice
4. **Network failure:** Save with offline (verify error handling)
5. **Partial lineups:** Some seats unfilled
6. **Athlete without assignment:** Shows "Assignment pending"

## Technical Notes for Testing

### @dnd-kit Configuration

Current setup uses:
- `PointerSensor` with 8px activation distance
- `KeyboardSensor` for accessibility
- `closestCenter` collision detection
- Optimistic UI updates with rollback on error

### API Patterns

All practice mutations follow pattern:
1. Validate with Zod schema
2. Check RBAC (coach only for writes)
3. Verify team ownership
4. Perform database operation
5. Return updated data

### State Management

- Server components fetch initial data
- Client components manage local state
- `router.refresh()` used for re-fetching after mutations
- Toast notifications via `sonner`

## Recommendations for Planning

### Priority Order

1. **PRAC-01 & PRAC-02** - Core creation flow (test together)
2. **PRAC-03** - Drag-drop lineups (most complex)
3. **PRAC-04** - Publishing (depends on lineups)
4. **PRAC-05** - Calendar (can test in parallel)

### Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| Drag-drop | Complex interactions | Test systematically |
| Multi-boat | State management | Test add/remove boats |
| Publishing | Visibility rules | Test both roles |
| Calendar | Many edge cases | Test date ranges |

### Suggested Task Structure

1. Create test practices with variety of blocks
2. Test block CRUD operations
3. Test lineup drag-drop flow
4. Test publishing workflow
5. Test athlete perspective
6. Test calendar views

## Sources

### Primary (HIGH confidence)
- Direct code audit of `/home/hb/radl/src/` codebase
- Prisma schema at `/home/hb/radl/prisma/schema.prisma`

### Files Examined
- 15+ component files
- 6+ API routes
- 2 page components
- 1 test file (practices.test.ts)

## Metadata

**Confidence breakdown:**
- Implementation existence: HIGH - verified via code
- Functionality: MEDIUM - needs manual verification
- Edge cases: LOW - require testing

**Research date:** 2026-01-29
**Valid until:** Indefinite (testing existing code)
