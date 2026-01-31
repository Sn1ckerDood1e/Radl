# Phase 38: Facility & Club Management - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Super admin manages the organizational hierarchy — facilities (physical locations) and clubs (rowing teams). Full CRUD operations on both entity types, plus the ability to move clubs between facilities. Member assignment is Phase 39.

</domain>

<decisions>
## Implementation Decisions

### List/browse experience
- Facilities displayed in simple table (name, club count, member count, created date)
- Clubs grouped by facility with collapsible sections
- Unified search bar finds both facilities and clubs
- Stats displayed: Claude's discretion on appropriate metrics

### Create/edit forms
- Facility slug auto-generated from name, with manual override option
- Facility location fields: Claude's discretion on appropriate structure
- Club fields: Essential setup that allows admin to fully configure a club
- No team colors for now (deferred from earlier decision)
- Initial coach assignment is a separate step (Phase 39 membership management)

### Delete behavior
- Cascade warning for both facilities and clubs
  - Facility delete: Shows affected clubs, requires confirmation
  - Club delete: Shows member count, requires confirmation
- Soft delete approach: Claude's discretion (hidden vs archived tab)
- Destructive actions require typing entity name to confirm

### Move club operation
- Available from both club list actions dropdown and club detail page
- Target facility selection: Claude's discretion on UX
- Confirmation shows impact summary (member count, any equipment changes)
- Equipment handling on move: Claude's discretion based on data model

</decisions>

<specifics>
## Specific Ideas

- Admin should be able to fully set up a club so they can then send coaches their password (end-to-end onboarding flow)
- Type-to-confirm pattern for destructive actions (like GitHub delete repo)

</specifics>

<deferred>
## Deferred Ideas

- Team colors customization — deliberately not included for now
- Initial member assignment during club creation — Phase 39 handles memberships

</deferred>

---

*Phase: 38-facility-club-management*
*Context gathered: 2026-01-31*
