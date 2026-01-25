# Phase 17: Facility UI Features - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Facility admins can manage clubs, shared equipment, and cross-club events through a dashboard interface. This is the user-facing culmination of the facility model — schema (Phase 12), auth (Phase 13), and design system (Phase 14/16) are complete and provide the foundation.

**Requirements in scope:**
- FAC-03: Club-level subscriptions with facility oversight
- FAC-05: Facility admin can view all clubs under facility
- FAC-06: Facility admin can manage shared equipment
- FAC-07: Equipment reservation/booking system for shared equipment
- FAC-08: Cross-club event scheduling (facility-wide events)
- FAC-09: Facility dashboard with aggregate statistics

</domain>

<decisions>
## Implementation Decisions

### Facility Dashboard Layout
- **Stats:** High-level totals only (total clubs, total athletes, total equipment, upcoming events)
- **Layout:** Card grid like club dashboard — large clickable cards for Clubs, Shared Equipment, Events, Settings
- **Club drill-down:** Facility admin gets full admin actions (can take actions on behalf of club — edit settings, manage members)

### Equipment Reservation Flow
- **Booking UX:** Practice-linked booking — reserve equipment as part of creating a practice (automatic)
- **Conflicts:** Request from other club — send request to the club that has it booked, they can approve/deny
- **Admin override:** Yes, full override — facility admin can reassign equipment, original club is notified
- **Booking window:** Facility admin configurable — each facility sets their own booking window (different facilities, different rules)

### Cross-club Event Creation
- **Event types:** Any event (practices, regattas, etc.) — facility admin can create any event type for selected clubs
- **Visibility:** Selected clubs only — facility admin picks which clubs the event applies to
- **Club control:** Full control after creation — once created, clubs can modify their copy (different times, notes)
- **Event styling:** No distinction — facility events look like any other event once on club calendar

### Club Oversight View
- **Subscription visibility:** Full billing visibility — plan, status, next billing date, usage limits
- **Subscription control:** Facility bills centrally — facility pays for all clubs, manages one subscription
- **Club list order:** Alphabetical (A-Z by club name)
- **Club creation:** Clubs self-register — clubs sign up themselves, facility admin approves/links them

### Claude's Discretion
- URL structure for facility dashboard (dedicated /facility/ namespace or mode toggle)
- Exact card layout and spacing
- Request/approval notification UI
- Booking window configuration UI

</decisions>

<specifics>
## Specific Ideas

- Dashboard card grid should mirror the existing club dashboard pattern for consistency
- Equipment requests work like invitation system — pending requests visible, can approve/deny
- Facility admin can view any club's dashboard as if they were a club admin

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-facility-ui-features*
*Context gathered: 2026-01-25*
