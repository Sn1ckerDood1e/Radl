# Phase 30: Equipment Flow Testing - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Test the complete equipment lifecycle from creation to damage resolution. This is E2E verification of existing functionality (like Phases 28-29), not implementation of new features.

**Requirements:**
- EQUP-01: Admin/coach can add equipment with full details
- EQUP-02: Equipment usage is tracked when assigned to lineups
- EQUP-03: Anyone can report damage via QR code without login
- EQUP-04: Coach can view damage reports and mark resolved

</domain>

<decisions>
## Implementation Decisions

### Equipment CRUD Verification
- Test ALL fields (name, type, status, manufacturer, model, year, serial number, notes)
- Verify all status transitions (AVAILABLE → IN_USE → DAMAGED → MAINTENANCE)
- Full CRUD testing: Create, Read, Update, Delete operations
- Verify QR code generation displays on equipment detail page

### Usage Tracking Verification
- Claude's discretion on what counts as "usage" (based on implementation)
- Claude's discretion on where to verify (list page, detail page, or both)
- Claude's discretion on whether to create fresh practice or use existing data
- Claude's discretion on detail depth (dates, practice names, seats)

### QR Damage Reporting Flow
- Test BOTH approaches: direct URL navigation AND real QR scan if possible
- Claude's discretion on which fields to verify (based on form implementation)
- Claude's discretion on success confirmation verification
- Claude's discretion on whether to verify equipment status change after report

### Damage Resolution Workflow
- Claude's discretion on where to verify reports (equipment detail, dedicated page, or both)
- Claude's discretion on resolution actions depth (simple toggle vs notes vs full workflow)
- Claude's discretion on RBAC verification (security audit already covered this)
- Claude's discretion on resolved report visibility (history vs filtered)

### Claude's Discretion
Most verification details left to Claude based on actual implementation:
- Usage tracking: definition, location, test approach, detail depth
- QR reporting: fields, feedback verification, status change verification
- Resolution: view location, action depth, role testing, history visibility

</decisions>

<specifics>
## Specific Ideas

- QR scanning should be tested with actual device camera if possible (not just URL navigation)
- Equipment CRUD should test all fields comprehensively since this is core functionality
- Status transitions are important — verify the full lifecycle

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-equipment-flow-testing*
*Context gathered: 2026-01-29*
