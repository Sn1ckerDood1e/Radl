# Phase 12: Facility Schema Migration - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema supporting facility → club → team hierarchy with RLS enforcement and backward-compatible equipment ownership. This phase creates the data layer — auth integration (Phase 13) and UI (Phase 17) are separate.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- Mandatory migration for all existing installations
- Migration runs automatically on deploy (part of deployment process, all data migrated before app starts)
- Existing teams get facility wrapper with same name (e.g., "Lookout Rowing" team → "Lookout Rowing" facility)
- Add facility layer above existing Team — keeps 3-level hierarchy (Facility → Club → Team)

### Equipment Ownership Model
- Clubs can opt-in share their equipment with other clubs in same facility
- Legacy team-owned equipment handling: Claude's discretion based on 3-level hierarchy

### Facility Model Structure
- Full profile on Facility model: name, location (address, coordinates, timezone), contact info, logo, description
- Hybrid billing: facility can pay for all clubs OR clubs can have individual subscriptions

### Claude's Discretion
- Shared equipment availability (always available vs reservation required)
- Approval workflow for facility equipment usage (no approval vs facility approval)
- RLS tenant context method (session variables vs JWT claims)
- RLS policy structure for facility-scoped vs club-scoped data
- Security approach (RLS-only vs defense-in-depth)
- Facility admin visibility scope (full vs aggregate-only)
- Whether clubs can exist without facility (standalone vs always-in-facility)
- FacilityMembership model design (club-only vs both levels)

</decisions>

<specifics>
## Specific Ideas

- Real-world scenario: Chattanooga Rowing (boathouse) hosts Lookout Rowing Club and Chattanooga Juniors, sharing some boats
- Expand-migrate-contract approach: backward compatibility for team-only installs
- Connection pooling safety is critical for RLS

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-facility-schema-migration*
*Context gathered: 2026-01-23*
