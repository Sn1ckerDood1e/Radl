# Phase 2: Practice Scheduling - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Coaches can create and manage practices with structured time blocks and equipment availability. Includes practice templates and a unified calendar view showing both practices and regattas. Lineup assignments to practices are a separate phase (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Practice Structure
- Blocks are an **ordered sequence** within a practice (warm-up → water → cool-down), not time-slotted
- Three core block types: **Water, Land, Erg** — covers 95% of rowing practices
- **Draft/published workflow**: Coach creates draft, publishes when ready. Athletes only see published practices.

### Calendar View
- **Same view for coach and athlete**, different actions (coach can edit, athlete is read-only)
- **Minimal practice cards**: Time + practice name only. Click for details.
- **Unified calendar**: Practices and regattas displayed together with different styling
- Regattas shown as placeholders until Phase 5 builds full regatta features

### Template System
- **Two template levels**: Practice templates (full structure) AND block templates (individual blocks)
- Coach can combine block templates to build practices, or apply a full practice template
- Practice templates capture all blocks with their metadata

### Equipment Availability
- Unavailable equipment **grayed out with reason** visible on hover/tap
- **Warning only** when assigning unavailable equipment — allows coach override
- **Combined readiness logic**: Auto-unavailable from open damage reports + manual status override both ways
- **Conflict detection**: Show warning indicator if same equipment assigned to overlapping practices

### Claude's Discretion
- Default calendar view (week vs month vs list) — pick based on typical rowing coaching patterns
- Per-block athlete groups — decide on simpler initial approach
- Template organization (flat list vs categories)
- What gets copied when applying template (structure only vs structure + metadata)
- Template edit behavior (in-place vs versioned)

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard approaches that fit rowing team workflows.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-practice-scheduling*
*Context gathered: 2026-01-21*
