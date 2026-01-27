# Phase 23: Dashboard Enhancements - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Add analytics and overview widgets to the dashboard. Focus on **immediate next practice/day** rather than deep analytics. Includes today's practices, fleet health overview, equipment usage trends, quick actions, with distinct coach and athlete dashboard variations.

Dependencies: Phase 21 (fleet health data), Phase 22 (practice data)

</domain>

<decisions>
## Implementation Decisions

### Widget Layout & Placement
- Priority hero pattern: one large widget at top, smaller widgets below
- Hero widget: Today's schedule (all of today's practices, or next upcoming if none today)
- Secondary widgets: Fleet health, Usage trends, Quick actions (all three)
- Mobile behavior: Claude's discretion based on content density

### Today's Practices Widget (Hero)
- Shows: Time + name + user's assignment (athletes see boat/seat, coaches see full count)
- Empty state: Show next upcoming practice with countdown (not "no practices" message)
- Interaction: Click expands preview inline, secondary link goes to full practice page
- Athlete lineup visibility: Claude's discretion based on space

### Equipment Usage Trends
- Chart type: Minimal sparkline (very compact)
- Time range: Current season
- Metric: Hours on water/erg (total duration, not count)
- Visibility: Coach-only (equipment management is coach concern)

### Coach vs Athlete View
- Completely different layouts optimized for each role
- **Athlete dashboard:**
  - Next practice with their assignment
  - Active announcements
  - Simple, focused — "where do I need to be"
- **Coach dashboard:**
  - Today's schedule hero
  - Fleet health widget
  - Usage trends sparkline
  - Context-aware quick actions

### Quick Actions (Coach)
- Context-aware rather than static buttons
- Shows attention-needed items:
  - "X boats need inspection" (equipment needing attention)
  - "X practices need lineups" (upcoming practices without assignments)
- Links directly to resolve the issue

### Claude's Discretion
- Mobile widget collapse/expand behavior
- Athlete lineup display prominence in hero
- Exact sparkline styling
- Loading and error states
- Widget card styling details

</decisions>

<specifics>
## Specific Ideas

- Dashboard should be simple — information needed for the next day or practice
- Not a deep analytics dashboard, focus on immediate actionability
- Athletes just need to know where to be and what they're doing
- Coaches need to see what needs their attention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-dashboard-enhancements*
*Context gathered: 2026-01-27*
