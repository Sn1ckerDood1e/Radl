---
phase: 03-lineup-management
plan: 08
subsystem: ui
tags: [lineup-editor, practice-detail, template-management, react, next.js]

# Dependency graph
requires:
  - phase: 03-05
    provides: Water lineup builder component
  - phase: 03-06
    provides: Land/erg assignment UI
  - phase: 03-07
    provides: Lineup template system components
provides:
  - Lineup editor integrated into practice detail page
  - Lineup templates list and detail pages
  - Complete lineup management UI workflow
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline editor pattern for practice blocks"
    - "View/edit toggle for template detail pages"
    - "Breadcrumb navigation for template pages"

key-files:
  created:
    - src/app/(dashboard)/[teamSlug]/lineup-templates/page.tsx
    - src/app/(dashboard)/[teamSlug]/lineup-templates/[id]/page.tsx
    - src/app/(dashboard)/[teamSlug]/lineup-templates/[id]/lineup-template-detail-client.tsx
  modified:
    - src/app/(dashboard)/[teamSlug]/practices/[id]/page.tsx
    - src/app/(dashboard)/[teamSlug]/practices/[id]/practice-detail-client.tsx

key-decisions:
  - "Inline lineup editor within practice detail (no separate route)"
  - "Per-block edit state for independent lineup editing"
  - "Template picker and save-as-template integrated in editor UI"
  - "ERG count hardcoded to 20 (not tracked as individual equipment)"
  - "Template list accessible to all team members, editing coach-only"

patterns-established:
  - "Inline editor pattern: Edit button toggles editor for specific block"
  - "Lineup preview in view mode: Shows boat name and seat count"
  - "Template management: List, detail, and inline integration"

# Metrics
duration: 6min
completed: 2026-01-21
---

# Phase 3 Plan 8: Practice Lineup Integration & Template Management Summary

**Lineup editor integrated into practice detail with template management UI completing Phase 3 lineup workflow**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-21T18:23:36Z
- **Completed:** 2026-01-21T18:29:56Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 2

## Accomplishments
- Integrated lineup editor into practice detail page with inline editing
- Created lineup templates list page with grid layout
- Built template detail page with view/edit modes and delete functionality
- Enabled per-block lineup editing with Edit Lineup / Manage Assignments buttons
- Added lineup preview in view mode showing boat name and seat counts
- Integrated template picker and save-as-template buttons in practice flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Update practice detail page with lineup editor** - `e55d72b` (feat)
2. **Task 2: Create lineup templates list page** - `24ff4fc` (feat)
3. **Task 3: Create lineup template detail page** - `40e8c40` (feat)

## Files Created/Modified

**Created:**
- `src/app/(dashboard)/[teamSlug]/lineup-templates/page.tsx` - Template list with grid cards, boat class and seat count
- `src/app/(dashboard)/[teamSlug]/lineup-templates/[id]/page.tsx` - Server component fetching template, athletes, boats
- `src/app/(dashboard)/[teamSlug]/lineup-templates/[id]/lineup-template-detail-client.tsx` - Client component with view/edit toggle, save/delete

**Modified:**
- `src/app/(dashboard)/[teamSlug]/practices/[id]/page.tsx` - Fetch athletes, boats, lineups, land assignments
- `src/app/(dashboard)/[teamSlug]/practices/[id]/practice-detail-client.tsx` - Add lineup editor integration, edit state, save handlers

## Decisions Made

**1. Inline editor pattern for practice blocks**
- Rationale: Keeps coaches in practice context, avoids navigation complexity
- Implementation: Edit button toggles editor state per block, inline rendering below block details
- Result: Simpler UX with fewer page transitions

**2. Per-block edit state**
- Rationale: Allows editing one lineup while viewing others
- Implementation: `editingLineupBlockId` state tracks currently editing block
- Result: Independent lineup editing without modal complexity

**3. ERG count hardcoded to 20**
- Rationale: ERG is not an EquipmentType enum value, individual ergs not tracked
- Implementation: Hardcoded `ergCount = 20` as default facility capacity
- Future: Could move to team settings for customization

**4. Template list accessible to all members**
- Rationale: Athletes can view templates even if they can't edit
- Implementation: requireTeam() instead of requireRole(['COACH'])
- Result: Transparency in lineup planning

**5. Template management follows practice template patterns**
- Rationale: Consistent UI/UX across template types
- Implementation: Grid layout, breadcrumbs, view/edit modes match practice templates
- Result: Familiar navigation and interaction patterns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript enum mismatches**
- Issue: Side vs SeatSide enum confusion, incorrect BoatClass enum values
- Resolution: Fixed type imports and enum value mapping (EIGHT -> EIGHT_8_PLUS, etc.)
- Impact: Required careful type checking and enum constant updates

**ERG equipment type missing**
- Issue: Attempted to query EquipmentType.ERG but enum only has SHELL, OAR, LAUNCH, OTHER
- Resolution: Hardcoded ergCount to 20 for now
- Note: ERG is BlockType, not EquipmentType

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 3 (Lineup Management) COMPLETE:**
- Water lineup builder with drag-and-drop
- Land/erg assignment UI with multi-select
- Lineup templates with save/apply workflow
- Practice detail integration with inline editing
- Template management pages

**All Phase 3 requirements verified:**
- LINE-01: Create lineups with boat assignments ✅
- LINE-02: Log equipment usage automatically ✅
- LINE-03: Save lineup as reusable template ✅
- LINE-04: Assign athletes to land/erg blocks ✅
- EQUIP-01: Track equipment usage history ✅

**Ready for Phase 4 (Offline & PWA):**
- Complete practice and lineup management foundation
- Data models and API endpoints stable
- UI patterns established for offline-first enhancements

**No blockers.**

**Considerations for Phase 4:**
- Lineup data will need offline sync strategy
- Practice blocks with lineups should cache boat/athlete data
- Template application may need conflict resolution for offline changes

---
*Phase: 03-lineup-management*
*Completed: 2026-01-21*
