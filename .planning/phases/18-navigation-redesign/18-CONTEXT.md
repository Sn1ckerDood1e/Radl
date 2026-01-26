# Phase 18: Navigation Redesign - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the app shell with master-detail layout — sidebar navigation on desktop, bottom navigation on mobile. Content displays in center area. Existing page content stays the same; only the navigation shell changes.

</domain>

<decisions>
## Implementation Decisions

### Sidebar structure
- Mirror existing dashboard cards: Roster, Practices, Equipment, Settings
- Icons + text always visible (no collapse/expand)
- Context switcher (facility/club/team) stays in header, not sidebar
- Role-filtered navigation: athletes only see items they can access

### Mobile bottom nav
- 5 items following iOS tab bar pattern
- Items mirror coach dashboard cards for that role
- Icons + labels always visible (small text under icons)

### Claude's Discretion
- Hide-on-scroll behavior for bottom nav (pick based on content type and mobile UX)
- Exact icon choices for each nav item
- Transition animations between sections
- Loading states when switching sections

</decisions>

<specifics>
## Specific Ideas

- "Keep it simple" — move what's on dashboard to sidebar/bottom nav
- Purpose is better navigation through the app for coaches and athletes
- Role-based filtering means athletes see a simpler nav than coaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-navigation-redesign*
*Context gathered: 2026-01-26*
