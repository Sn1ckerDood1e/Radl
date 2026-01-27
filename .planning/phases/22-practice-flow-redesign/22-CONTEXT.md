# Phase 22: Practice Flow Redesign - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild practice creation/editing with inline forms, block-based structure, drag-drop lineups, and bulk scheduling. Includes workout builder inspired by PM5/Concept2 pattern.

**Guiding principle:** Greatest impact with simplest method. No unnecessary friction.

</domain>

<decisions>
## Implementation Decisions

### Block Structure & Types
- Type buttons visible directly (+ Water, + Erg, + Land, + Meeting)
- Blocks start as quick templates, editable by coach
- Blocks are content containers, not time-boxed — no duration/times, just describe what happens
- Minimum required: Type + title, then expand to add details
- Reordering: Both drag handle AND up/down arrows for flexibility

### Lineup Builder
- Athletes shown in simple scrollable list, searchable
- Select boat from team's equipment dropdown (ties to inventory)
- Boat class determines seat grid shown
- Multiple boats can be added to a single water block
- One athlete per boat per practice — once assigned, removed from available panel
- Swap behavior: dragging to occupied seat swaps athletes directly
- Unavailable athletes hidden by default, toggle to reveal
- Seat display: simple numbered list/grid (not visual boat diagram)
- Drag between boats/seats moves athlete directly

### Inline Editing Flow
- Always editable — no edit mode, fields are live
- Save on blur (finish editing, move away, it saves)
- No success feedback (silent save)
- Errors: toast notification with retry button
- Coach can drag athletes between boats to reassign

### Workout Definition (PM5-Inspired)
- Structured builder like PM5: add intervals one by one
- Full PM5 workout types: single time, single distance, intervals, variable intervals
- Water workouts: same structure but with stroke rate targets instead of pace
- Workout templates: save named templates for reuse
- Coach controls visibility — can toggle whether athletes see workout details
- Erg assignment: optional (can assign specific ergs from inventory or leave unassigned)

### Bulk Practice Creation
- Date range picker (start/end dates)
- Day + time picker (Mon, Wed, Fri at 6:00 AM)
- Optional template: can apply practice template or create empty practices
- Generates all practices within range matching day/time criteria

### Bulk Delete
- Checkbox selection on practice list
- Select multiple practices, then delete

### Claude's Discretion
- LAND and MEETING block fields (keep simple)
- Exact drag-drop implementation details
- Loading states and transitions
- Workout builder UI layout

</decisions>

<specifics>
## Specific Ideas

- "PM5/Concept2 erg workout creation is the reference for workout entry UX"
- "Water workouts should be similar to erg but with stroke rate targets"
- "Greatest impact with simplest method" — avoid overcomplication
- "When creating a season, choose days and times, add basic structure, then it creates all practices"

</specifics>

<deferred>
## Deferred Ideas

None — bulk creation included in phase scope per user request

</deferred>

---

*Phase: 22-practice-flow-redesign*
*Context gathered: 2026-01-27*
