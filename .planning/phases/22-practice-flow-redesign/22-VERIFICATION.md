---
phase: 22-practice-flow-redesign
status: gaps_found
verified_at: 2026-01-27
score: 6/9
---

# Phase 22 Verification Report

## Phase Goal
Rebuild practice creation/editing with inline forms, block structure, and drag-drop lineups.

## Must-Haves Verification

### Verified ✓

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| Inline editing saves on blur | ✓ | InlineTextField, InlineTextarea components |
| Block-based structure with types | ✓ | WATER, ERG, LAND, MEETING types working |
| Sortable block list | ✓ | Drag-drop and arrow buttons functional |
| Lineup builder supports multiple boats | ✓ | MultiBoatLineupBuilder with cross-boat drag |
| Workout builder follows PM5 pattern | ✓ | Intervals, 50 limit, type selection |
| Bulk delete with selection mode | ✓ | PracticeListClient with checkboxes |

### Gaps Found ✗

| Gap | Description | Impact |
|-----|-------------|--------|
| GAP-01: Workout UI cleanup | Duration/rest inputs need better units display, layout cramped | UX polish |
| GAP-02: Practices/Schedule fragmentation | Two pages doing overlapping things, inconsistent UX | Major UX issue |
| GAP-03: No season management | Can only create season when zero exist, no way to add new | Feature gap |
| GAP-04: New practice form mismatch | `/practices/new` uses old form, doesn't match inline editing pattern | Consistency |

## Gap Details

### GAP-01: Workout UI Cleanup
**Current:** Interval row is cramped with small inputs and unclear units
**Expected:** Clean, readable interval builder with clear units (already partially fixed with sec/m/spm labels)
**Fix:** Review and polish the workout-interval-row layout

### GAP-02: Practices/Schedule Page Consolidation
**Current:**
- Schedule page: calendar view, season creation (only when empty), links to old practice form
- Practices page: list view, bulk create, selection mode, no calendar

**Expected:** Single unified page with:
- Calendar/list view toggle
- Season management always accessible to coaches
- Bulk operations
- Consistent "new practice" flow

**Fix:** Merge pages, deprecate redundant schedule page

### GAP-03: Season Management
**Current:** CreateSeasonForm only shows when team has zero seasons
**Expected:** Coaches can always create new seasons, archive old ones
**Fix:** Add season management UI to consolidated practices page

### GAP-04: New Practice Form Inconsistency
**Current:** `/practices/new` uses old PracticeForm component
**Expected:** Either:
- Inline creation (click date/button → creates draft → edit inline)
- Or redirect to bulk-create pattern

**Fix:** Replace old form with inline creation flow or bulk-create redirect

## Recommended Gap Closure Plans

1. **22-10**: Consolidate practices and schedule pages
2. **22-11**: Add season management UI
3. **22-12**: Replace new practice form with inline creation
4. **22-13**: Final verification (re-run UAT)

## Human Verification Notes

User testing on 2026-01-27 identified:
- "Workout blocks need UI cleanup"
- "No way to make a new season in schedule"
- "New practice UI doesn't match new create flow"
- "Practices and schedule are poorly trying to do the same thing - merge them"
