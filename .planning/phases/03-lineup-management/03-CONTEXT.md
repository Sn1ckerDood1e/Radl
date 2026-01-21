# Phase 3: Lineup Management - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Coaches assign athletes to seat positions in boats for water blocks, assign compatible equipment to lineups, and can reuse lineup configurations via templates. Land/erg blocks use group assignment without seat positions. Equipment usage is automatically logged when boats are assigned.

</domain>

<decisions>
## Implementation Decisions

### Seat Assignment Interface
- Drag-and-drop assignment (athletes dragged from roster into seat slots)
- Traditional rowing position labels: Bow, 2, 3, 4, 5, 6, 7, Stroke, Coxswain (varies by boat size)
- When athlete is dropped into a seat and already assigned elsewhere in this practice: auto-remove from previous position
- Reorder within lineup: drag-to-swap between seats
- Quick fill option: apply saved lineup template to populate
- Partial lineups: warn but allow (can save with empty seats)

### Boat Compatibility Rules
- Size mismatch handling: auto-filter (only show boats matching lineup size)
- Unavailable boats (damaged/maintenance): hide from selection list entirely
- Double booking (same boat in overlapping blocks): warn but allow override
- Oars assignment: Claude decides whether to include oar assignment or just boats

### Water vs Land/Erg Blocks
- Land/erg block capacity: show count of assigned vs available, no hard limit
- Athletes can be assigned to multiple blocks in same practice (freely, no restrictions)

### Athlete Selection Flow
- Roster display: full list of all team athletes, scrollable
- Ineligible athletes (for current season): hidden entirely from roster
- Already assigned elsewhere in practice: filter option (toggle to show/hide)
- Search: yes, filter by athlete name

### Claude's Discretion
- Port/starboard side visual distinction (may depend on sweep vs scull boat class)
- Athlete info display (hover tooltips, always visible, or minimal)
- Boat info display in selection (usage stats, last used, or just name/class)
- Land/erg assignment UI approach (roster groups, multi-select checkboxes, or simplified drag-drop)
- Same editor component with mode switch vs separate water/land editors

</decisions>

<specifics>
## Specific Ideas

- Traditional rowing terminology is important (Bow, Stroke, Coxswain) - coaches expect this vocabulary
- Drag-and-drop should feel natural for building lineups quickly
- Templates are key for efficiency - coaches reuse the same lineups often
- Auto-filtering boats by size prevents common mistakes

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 03-lineup-management*
*Context gathered: 2026-01-21*
