# Phase 21: Equipment Readiness - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Calculate and display equipment readiness status based on inspections and maintenance. Includes visual badges, maintenance workflow, and configurable thresholds. This phase delivers EQR-01, EQR-02, EQR-03 requirements.

**Guiding principle:** Simple, configurable in settings, non-intrusive for coaches.

</domain>

<decisions>
## Implementation Decisions

### Readiness Calculation
- 3 factors determine status: days since inspection, open damage reports, manual status override
- Threshold rules (not weighted scores): >14 days = warning, >21 days = attention, etc.
- Manual "Mark as Inspected" button on equipment detail page
- Calculate on page load (no background jobs, no caching)

### Status Levels & Badges
- 4 levels: READY, INSPECT_SOON, NEEDS_ATTENTION, OUT_OF_SERVICE
- Traffic light colors: green, yellow, amber, red
- Badges appear on equipment list AND dashboard widget (fleet health overview)
- Coaches can manually override calculated status with required note

### Maintenance Workflow
- Minimal: Open → Resolved (two states only)
- Optional note on resolution (no friction)
- Coaches only can resolve issues
- History retention by severity: CRITICAL/MODERATE kept forever, MINOR archived after resolution

### Thresholds & Triggers
- Settings live in Team Settings page (each team configures their own)
- Default thresholds: 14 days (Inspect Soon), 21 days (Needs Attention), 30 days (Out of Service)
- Threshold changes apply retroactively (immediate status recalculation)
- No push notifications — visual badges only (non-intrusive)

### Claude's Discretion
- Exact badge component styling
- Dashboard widget layout
- History archive implementation details
- Settings form field arrangement

</decisions>

<specifics>
## Specific Ideas

- "Simple and changeable in settings and not interrupt the coaches job"
- Major damage (CRITICAL/MODERATE) kept for equipment lifecycle history
- Minor issues (shoe replacement, rigging adjustment) don't need permanent records
- Fleet health widget on dashboard for at-a-glance overview

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-equipment-readiness*
*Context gathered: 2026-01-26*
