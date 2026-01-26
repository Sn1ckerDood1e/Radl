# Phase 19: Announcements System - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable coaches to broadcast important information to the team. Simple announcement system with priority levels, display on dashboard and as banners for urgent items.

</domain>

<decisions>
## Implementation Decisions

### Announcement display
- **Placement:** Both banner AND dashboard section
  - Urgent announcements show as banner at top of all team pages
  - All announcements appear in dashboard section
- **Density:** Show all active announcements (scrollable if many)
- **Interaction:** Title + expand — show title, click to see full body
- **Banner behavior:** Dismissible (X button hides, reappears on new urgent)

### Priority treatment
- **Visual:** Color coding — blue for info, amber for warning, red for urgent
- **Sort order:** Priority first — urgent → warning → info, then by date within priority

### Lifecycle & dismissal
- **Expiry:** Both options — coach can set expiry date OR leave open-ended (manual archive)
- **Athlete interaction:** Mark as read — visual change (dimmed/checkmark) but announcement stays visible

### Practice linking
- **Placement:** Dashboard + practice — shows on dashboard AND on linked practice detail page
- **Auto-expire:** Yes — practice-linked announcements automatically hide after practice date passes

### Claude's Discretion
- Exact color shades for priority levels (within blue/amber/red families)
- Animation for banner appearance/dismissal
- "Mark as read" visual treatment (dimmed opacity, checkmark, etc.)
- Empty state when no announcements exist
- Coach UI layout for create/edit form

</decisions>

<specifics>
## Specific Ideas

- Keep it simple — coaches communicate important info to the team
- Priority levels drive both visual treatment and sort order
- Athletes don't lose announcements (mark as read, not dismiss)
- Practice context flows through naturally (dashboard + practice page + auto-expire)

</specifics>

<deferred>
## Deferred Ideas

- Push notifications for urgent announcements (NOTIF-03 — future milestone)

</deferred>

---

*Phase: 19-announcements-system*
*Context gathered: 2026-01-26*
