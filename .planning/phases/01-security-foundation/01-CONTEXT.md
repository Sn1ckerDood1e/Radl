# Phase 1: Security & Foundation - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure multi-tenant foundation with season-scoped data organization. This phase:
- Fixes JWT claims verification gaps
- Adds rate limiting to sensitive endpoints
- Audits and verifies tenant data isolation
- Creates season container model
- Implements season-scoped athlete eligibility
- Extracts duplicated claims helper utility (DEBT-01)

</domain>

<decisions>
## Implementation Decisions

### Rate Limiting Behavior
- Claude's discretion on specific limits (recommended: ~10/hour for damage reports, ~5-10/hour for join attempts)
- Claude's discretion on response messages (generic vs explicit)
- Claude's discretion on whether authenticated users get higher limits

### Season Model Design
- Seasons have **name + optional date range** (both supported)
- **Multiple seasons can be active simultaneously** (e.g., "Fall Racing" and "Novice Training" overlap)
- Seasons **auto-archive when end date passes** (no manual close required)
- **Any admin role** (coaches, future admin roles) can create/manage seasons

### Eligibility Rules
- **Both manual flag AND rules-based** eligibility
- Trackable criteria:
  - Waiver signed
  - Swim test passed
  - Custom fields (team-defined requirements)
- **Athletes see full visibility** of their eligibility status and what's missing
- **Warning only** when assigning ineligible athlete to practice (allow override, don't block)

### Error Responses
- Cross-team access: Claude's discretion (404 vs 403)
- Error messages: **Context-dependent** — generic for security-sensitive (cross-team), helpful for role/permission errors
- Session expiration: **Modal prompt** asking to re-authenticate without losing page state
- Global error boundary: **Friendly error page with error reference ID** for support

### Claude's Discretion
- Specific rate limit numbers
- Rate limit exceeded response messaging
- Whether authenticated users get higher rate limits
- HTTP status codes for cross-team access attempts
- Claims helper utility implementation details
- RLS vs application-level tenant filtering approach

</decisions>

<specifics>
## Specific Ideas

- Session expiration should NOT lose the user's work — modal re-auth is important for coaches editing lineups
- Error IDs help with support — if something breaks, user can reference the ID
- Eligibility warnings should be clear but not blocking — coaches know their athletes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-security-foundation*
*Context gathered: 2026-01-20*
