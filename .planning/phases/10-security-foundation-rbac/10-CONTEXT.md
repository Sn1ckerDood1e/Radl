# Phase 10: Security Foundation & RBAC - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement bulletproof role hierarchy (FACILITY_ADMIN → CLUB_ADMIN → COACH → ATHLETE → PARENT) with tenant-scoped permissions, audit logging for security-critical operations, secure session management, and API key authentication for external integrations.

</domain>

<decisions>
## Implementation Decisions

### Role hierarchy behavior
- Role-specific permissions only — higher roles do NOT inherit lower-role permissions
- FACILITY_ADMIN has admin powers but cannot create lineups unless also assigned COACH role
- Users can hold multiple roles explicitly (e.g., CLUB_ADMIN + COACH) for expanded capabilities
- PARENT role sees: their linked athlete(s) data + team schedule (not other athletes' lineups)
- Invited users do not exist in system until they accept — no placeholder entries, no pre-assignment to lineups

### Multi-club membership
- Club switcher: dropdown in nav header showing current club, switch refreshes all data
- Remember last visited club — user lands in most recent club on login
- Role display: Claude's discretion on exact placement (dropdown badges, header badge, or both)
- Existing user invite flow: Claude's discretion on auto-link vs. confirmation based on security best practices

### Audit logging scope
- Security-critical actions only (~10 action types): role changes, deletions, exports, auth events
- Role-scoped viewing: facility admin sees all, club admin sees their club, coaches see own actions
- 365-day retention as specified in success criteria
- CSV export for compliance — admin can export filtered logs
- Log UI format: Claude's discretion on list vs. activity feed style

### API key design
- Full access — API key has same permissions as the user who created it
- Centralized management: club admin panel manages all API keys for the club
- Expiration policy: Claude's discretion based on security best practices
- Rate limiting approach: Claude's discretion on implementation

### Claude's Discretion
- Role display exact UX (dropdown badges vs. header badge vs. both)
- Existing user invite linking behavior (auto-link vs. confirm)
- Audit log UI format (table list vs. human-readable activity feed)
- API key expiration policy (optional vs. required, max duration)
- API key rate limiting approach (global vs. per-key, limits)

</decisions>

<specifics>
## Specific Ideas

- Multi-club scenario: user might be COACH at Lookout Rowing and ATHLETE at CRA Juniors
- Admins who also coach must hold both roles explicitly — this keeps permissions auditable
- Parents should see enough to know when/where practice is and what boat their kid is in

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-security-foundation-rbac*
*Context gathered: 2026-01-22*
