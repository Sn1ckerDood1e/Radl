# Phase 39: Membership Management - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Super admin can directly manage user-club relationships bypassing the normal invitation flow. Add users to clubs, remove them, change roles, view cross-org memberships, and bulk import members via CSV. This is admin-only functionality.

</domain>

<decisions>
## Implementation Decisions

### Add/Remove Flow
- UI available from BOTH user detail page (add user to any club) AND club detail page (add any user to club)
- User selection via search by email/name with dropdown autocomplete
- Adding to club is immediate (no invitation, no acceptance needed)

### Role Assignment
- Multi-role support: user can hold multiple roles simultaneously in one club (e.g., COACH and ATHLETE)
- All roles assignable including FACILITY_ADMIN and CLUB_ADMIN (super admin has full control)

### Bulk Import
- CSV import for adding multiple users to a club at once
- If email doesn't match existing user: skip that row with error, continue processing others
- Results summary shows successes, skipped rows with reasons

### Membership Display
- User detail page shows all memberships across all facilities/clubs
- Memberships enable inline edit (change roles) and remove actions

### Claude's Discretion
- Confirmation dialog vs undo toast for remove action
- Behavior when adding user who's already a member (error vs update roles)
- Default role when adding (ATHLETE or require selection)
- Role change UX (replace selection vs toggle checkboxes)
- CSV columns (email + role, or email only with default)
- Bulk import location (club detail page vs dedicated page)
- Progress display during bulk import
- Membership grouping (by facility vs flat list)
- Inline actions style (buttons vs dropdown)
- Club detail members section (list vs count with link)
- Immediate vs batch save for changes

</decisions>

<specifics>
## Specific Ideas

- Follow patterns established in Phase 37 (user management) and Phase 38 (club management) for consistency
- Bulk import should match Phase 37 CSV user import patterns
- Search autocomplete should feel responsive (debounced, shows results quickly)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-membership-management*
*Context gathered: 2026-01-31*
