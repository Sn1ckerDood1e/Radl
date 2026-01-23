# Phase 13: Facility Auth Integration - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire facility hierarchy into authentication flow. JWT claims and RLS helpers already exist from Phase 12. This phase integrates them into the application auth flow: context switching, CASL ability updates, cache invalidation, and facility admin data access patterns.

</domain>

<decisions>
## Implementation Decisions

### Context Switching UX
- Dropdown in header showing current context, always visible
- Show club name only (no role badge or logo)
- Facility admin sees facility as top option, then clubs underneath grouped
- Switch behavior: Claude's discretion (seamless SPA vs soft reload)

### Facility Admin Data Access
- Read-only drill-down: can view individual club data but not modify
- Club impersonation: Claude's discretion (explicit CLUB_ADMIN role vs switch-into vs delegated actions)
- Shared equipment management: Claude's discretion
- Cross-club data comparisons: Claude's discretion

### Session & Cache Handling
- Session on switch: Claude's discretion (keep session with claim refresh vs silent re-auth)
- Cache invalidation strategy: Claude's discretion (full clear vs selective)
- Login behavior: Restore last used context
- Invalid context fallback: Claude's discretion

### CASL Ability Structure
- Facility vs club ability relationship: Claude's discretion
- Ability computation timing: Claude's discretion
- Super admin bypass: Claude's discretion
- Permission denied UI: Hide unavailable actions/pages entirely

### Claude's Discretion
- Switch behavior (seamless vs reload)
- Club impersonation model
- Shared equipment management scope
- Cross-club data comparison availability
- Session handling on context switch
- Cache invalidation aggressiveness
- Invalid context fallback behavior
- CASL ability structure and timing
- Super admin capability

</decisions>

<specifics>
## Specific Ideas

- Facility admin dropdown should show facility first, making it clear they can view at facility level
- User should land in their last-used context on login — continuity is important
- Don't show things users can't do — cleaner than disabled states everywhere

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-facility-auth-integration*
*Context gathered: 2026-01-23*
