---
phase: 22-practice-flow-redesign
plan: 08
subsystem: practices
tags: [bulk-operations, date-picker, multi-select, react-day-picker]
depends_on:
  requires: ["22-01", "22-03"]
  provides:
    - Bulk practice creation API with template support
    - BulkPracticeCreator component with date range picker
    - Bulk delete with multi-select checkbox list
  affects: ["22-09"]
tech_stack:
  added: []
  patterns:
    - react-day-picker v9 for date range selection
    - Day-of-week toggle buttons for schedule patterns
    - Client-side multi-select with checkbox mode
key_files:
  created:
    - src/app/api/practices/bulk/route.ts
    - src/components/practices/bulk-practice-creator.tsx
    - src/components/practices/practice-list-client.tsx
    - src/app/(dashboard)/[teamSlug]/practices/bulk-create/page.tsx
  modified:
    - src/app/(dashboard)/[teamSlug]/practices/page.tsx
decisions:
  - "Max 100 practices per bulk operation for performance"
  - "Template blocks copied to each practice in transaction"
  - "Day-of-week toggles default to Mon/Wed/Fri (common rowing schedule)"
  - "Quick preset buttons for 4-week and 8-week ranges"
  - "Selection mode toggle separates viewing from bulk selection"
  - "Click on practice card toggles selection when in selection mode"
metrics:
  duration: "15 minutes"
  completed: 2026-01-27
---

# Phase 22 Plan 08: Bulk Operations Summary

Bulk practice creation with date range picker, day-of-week selection, template application, and multi-select delete from practice list.

## What Was Built

### Task 1: Bulk Practice API Endpoint

Created `/api/practices/bulk` with POST and DELETE methods:

**POST - Bulk Create:**
- Accepts array of ISO datetime strings (max 100)
- Validates season belongs to user's club
- Optional template ID copies blocks to each practice
- Creates all practices in single transaction
- Returns count and practice IDs

**DELETE - Bulk Delete:**
- Accepts array of practice IDs (max 100)
- Only deletes practices belonging to user's club
- Returns count of deleted practices

### Task 2: BulkPracticeCreator Component

Date range picker with comprehensive scheduling options:

- **Date Range:** Click to select start date, click again for end date
- **Quick Presets:** "Next 4 weeks" and "Next 8 weeks" buttons
- **Day Selection:** Toggle buttons for each day of week (defaults: Mon/Wed/Fri)
- **Time Inputs:** Start and end time with dark mode support
- **Template Selection:** Optional dropdown to apply practice template
- **Name Pattern:** Optional custom name or auto-generate with dates
- **Preview:** Shows practice count and date range before creation

Dark theme styling for react-day-picker v9 with range highlighting.

### Task 3: Bulk Create Page and Enhanced Practice List

**Bulk Create Page (`/[teamSlug]/practices/bulk-create`):**
- Back navigation to practices list
- Season selector (requires at least one active season)
- Full BulkPracticeCreator component

**Enhanced Practice List Page:**
- Added "Create Multiple" button alongside "New Practice"
- Selection mode toggle ("Select multiple" / "Cancel selection")
- Checkbox on each practice card when in selection mode
- "Select all" / "Deselect all" functionality
- Bulk delete button with confirmation
- Visual feedback (emerald border) for selected items
- MEETING block type styling added (purple)

## Implementation Details

### Date Generation Algorithm

```typescript
const practiceDates = useMemo(() => {
  if (!startDate || !endDate || startDate > endDate) return [];
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });
  return allDates.filter(date =>
    selectedDays.includes(getDay(date) as DayOfWeek)
  );
}, [startDate, endDate, selectedDays]);
```

Uses date-fns `eachDayOfInterval` and `getDay` to filter to selected days of week.

### Selection Mode UX

- Toggle "Select multiple" enters selection mode
- Clicking practice card toggles selection (no navigation)
- Checkboxes appear next to each card
- Selected cards have emerald border highlight
- Delete button shows count of selected items
- Confirmation dialog before delete
- Auto-exits selection mode after delete

## Commits

| Hash | Description |
|------|-------------|
| 66a8331 | feat(22-08): create bulk practice API endpoint |
| 8b6ed14 | feat(22-08): create BulkPracticeCreator component |
| 583ff97 | feat(22-08): create bulk create page and multi-select practice list |

## Verification

- [x] TypeScript compiles without errors
- [x] Bulk create API creates multiple practices
- [x] Bulk delete API removes selected practices
- [x] BulkPracticeCreator shows date range picker
- [x] Day of week selection works
- [x] Template selection available when templates exist
- [x] Practice count preview is accurate
- [x] Bulk create page accessible from practice list
- [x] Multi-select mode works on practice list
- [x] Bulk delete removes selected practices

## Deviations from Plan

None - plan executed exactly as written.

## CONTEXT.md Alignment

All CONTEXT.md requirements for bulk operations implemented:

| Requirement | Implementation |
|------------|----------------|
| Date range picker (start/end dates) | DayPicker with click-to-select range |
| Day + time picker (Mon, Wed, Fri at 6:00 AM) | Toggle buttons + time inputs, Mon/Wed/Fri default |
| Optional template application | Template dropdown with auto-fill times |
| Checkbox selection on practice list | Selection mode with checkboxes |
| Select multiple, then delete | Multi-select with bulk delete button |

## Next Phase Readiness

Plan 22-09 (Final Integration) can proceed. Bulk operations complete and ready for integration testing.
