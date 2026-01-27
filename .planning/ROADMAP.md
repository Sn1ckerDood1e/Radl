# v2.1 UX Refinement Roadmap

## Milestone Overview

**Version:** 2.1
**Goal:** Elevate UX with RIM-inspired features, improved navigation, and better practice workflows
**Phases:** 18-24 (7 phases)
**Status:** Planning

## Previous Milestones

- v2.0 Commercial Readiness — Phases 10-17 (shipped 2026-01-26) [-> archive](milestones/v2.0-ROADMAP.md)
- v1.1 Polish — Phases 6-9 (shipped 2026-01-22) [-> archive](milestones/v1.1-ROADMAP.md)
- v1.0 MVP — Phases 1-5 (shipped 2026-01-22) [-> archive](milestones/v1.0-ROADMAP.md)

## Phase Structure

### Phase 18: Navigation Redesign
**Goal:** Implement master-detail layout with sidebar navigation on desktop and bottom nav on mobile

**Requirements:** NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, NAV-06

**Scope:**
- Desktop layout with left sidebar containing main navigation sections
- Master-detail pattern: nav items load content in center area
- Mobile layout with bottom navigation bar
- Responsive breakpoint at 768px
- Active state indicators for current section
- Preserve existing page content, change only the shell/layout

**Plans:** 1 plan
Plans:
- [x] 18-01-PLAN.md — Navigation shell with sidebar (desktop) and bottom nav (mobile)

**Dependencies:** None (foundational change)

---

### Phase 19: Announcements System
**Goal:** Enable coaches to broadcast messages to their team with priority levels

**Requirements:** ANN-01, ANN-02, ANN-03

**Scope:**
- Announcement model with priority (info, warning, urgent), title, body, expiry
- Coach UI to create/edit/delete announcements
- Athlete dashboard widget showing active announcements sorted by priority
- Optional practice linking for context-specific announcements
- Push notification integration (future: NOTIF-03)

**Plans:** 4 plans
Plans:
- [x] 19-01-PLAN.md — Data foundation: schema, CASL, validation
- [x] 19-02-PLAN.md — API layer: CRUD endpoints and mark-as-read
- [x] 19-03-PLAN.md — Display components: badge, card, list, banner
- [x] 19-04-PLAN.md — Page integration: coach management, dashboard, layout banner

**Dependencies:** Phase 18 (uses new layout)

---

### Phase 20: Public Issue Reporting
**Goal:** Allow anyone to report equipment issues via QR code without authentication

**Requirements:** ISS-01, ISS-02, ISS-03

**Scope:**
- Public route `/report/[equipmentId]` accessible without login
- QR code generation for each equipment item
- Issue form: equipment selector, severity radio (minor/moderate/critical), category dropdown, description textarea, required reporter name
- Submit creates DamageReport and notifies coaches
- Success confirmation with reference number and "Report Another" option
- Honeypot bot protection and rate limiting
- Email notifications for critical severity issues
- Individual and bulk QR code export (PDF)

**Plans:** 5 plans
Plans:
- [x] 20-01-PLAN.md — Data foundation: schema extension, validation, dependencies
- [x] 20-02-PLAN.md — Form enhancements: severity, category, reporter name, honeypot
- [x] 20-03-PLAN.md — API and notifications: severity routing, email alerts
- [x] 20-04-PLAN.md — Individual QR: download button on equipment detail
- [x] 20-05-PLAN.md — Bulk QR export: PDF generation with all equipment

**Dependencies:** None (uses existing equipment model)

---

### Phase 21: Equipment Readiness
**Goal:** Calculate and display equipment readiness status based on inspections and maintenance

**Requirements:** EQR-01, EQR-02, EQR-03

**Scope:**
- Readiness calculation: days since inspection, open alerts, lifecycle state
- Status enum: READY, INSPECT_SOON, NEEDS_ATTENTION, OUT_OF_SERVICE
- Visual badges with color coding (green/yellow/amber/red)
- Equipment list and detail pages show readiness status
- Maintenance workflow: status transitions, photo uploads, resolution notes
- Maintenance history on equipment detail page

**Plans:** 5 plans
Plans:
- [x] 21-01-PLAN.md — Data foundation: schema extensions (lastInspectedAt, thresholds, resolutionNote)
- [x] 21-02-PLAN.md — Readiness calculation: threshold-based status logic
- [x] 21-03-PLAN.md — Badge component: ReadinessBadge with CVA variants
- [x] 21-04-PLAN.md — UI integration: equipment list/detail, Mark as Inspected
- [x] 21-05-PLAN.md — Dashboard widget: fleet health overview
- [x] 21-06-PLAN.md — Settings UI: threshold configuration form

**Dependencies:** Phase 20 (maintenance alerts feed readiness)

---

### Phase 22: Practice Flow Redesign
**Goal:** Rebuild practice creation/editing with inline forms, block structure, and drag-drop lineups

**Requirements:** PRC-01, PRC-02, PRC-03, PRC-04, PRC-05, PRC-06, PRC-07, PRC-08

**Scope:**
- Inline editing: edit practice details on the practice page itself
- Block-based structure: practice divided into time blocks
- Block types: WATER, ERG, LAND, MEETING with type-specific form fields
- Water blocks: boat selection, lineup assignment
- Erg blocks: machine assignment, workout details
- Drag-drop lineup builder: available athletes panel, drag into boat seats
- Athlete availability indicators
- Workout structure within blocks: intervals, pieces, steady state
- Block reordering via drag
- Bulk practice creation with date range and day selection
- Bulk practice deletion with multi-select

**Plans:** 13 plans (9 core + 4 gap closure)
Plans:
- [x] 22-01-PLAN.md — Data foundation: MEETING type, Workout/WorkoutTemplate models
- [x] 22-02-PLAN.md — Inline editing: useAutosave hook, InlineTextField, InlineTextarea
- [x] 22-03-PLAN.md — API layer: PATCH endpoints, workout CRUD, templates
- [x] 22-04-PLAN.md — Block components: InlineBlockEditor, BlockTypeButtons, SortableBlockList
- [x] 22-05-PLAN.md — Workout builder: PM5-style intervals, templates
- [x] 22-06-PLAN.md — Multi-boat lineup: drag between boats, swap behavior
- [x] 22-07-PLAN.md — Practice page integration: inline editing, block content
- [x] 22-08-PLAN.md — Bulk operations: create multiple, delete selected
- [x] 22-09-PLAN.md — Final integration and verification
- [x] 22-10-PLAN.md — Gap closure: Consolidate practices/schedule pages
- [x] 22-11-PLAN.md — Gap closure: Season management UI
- [x] 22-12-PLAN.md — Gap closure: Replace new practice form with bulk-create redirect
- [x] 22-13-PLAN.md — Gap closure: Workout interval row UI polish

**Dependencies:** Phase 18 (uses new layout patterns)

---

### Phase 23: Dashboard Enhancements
**Goal:** Add role-specific dashboards with Today's Schedule hero, usage trends, and context-aware quick actions

**Requirements:** DASH-01, DASH-02, DASH-03

**Scope:**
- Today's practices widget (hero): scheduled practices with time, athlete count
- Fleet health overview: aggregate readiness across all equipment (already exists from Phase 21)
- Equipment usage trends: sparkline showing hours over time (coach-only)
- Quick actions: context-aware attention items (equipment needing inspection, practices needing lineups)
- Separate coach and athlete dashboard layouts optimized for each role
- Athlete dashboard: next practice with their boat/seat assignment, announcements only

**Plans:** 6 plans
Plans:
- [x] 23-01-PLAN.md — Foundation: Sparkline component, usage aggregation utilities
- [x] 23-02-PLAN.md — Coach widgets: TodaysScheduleWidget, QuickActionsWidget
- [x] 23-03-PLAN.md — Athlete widgets: NextPracticeWidget, UsageTrendsWidget
- [x] 23-04-PLAN.md — Dashboard layouts: CoachDashboard, AthleteDashboard components
- [x] 23-05-PLAN.md — Data queries: dashboard-specific fetching functions
- [x] 23-06-PLAN.md — Page integration: role-based routing, parallel data fetching

**Dependencies:** Phase 21 (fleet health), Phase 22 (practice data)

---

### Phase 24: Regatta Central Public API
**Goal:** Integrate RC public API to display upcoming regatta schedules

**Requirements:** RC-01, RC-02, RC-03, RC-04

**Scope:**
- RC public API client: fetch regatta list endpoint
- Response caching with configurable TTL (avoid rate limits)
- Regatta display: name, date, location, registration status
- Calendar integration: regattas appear as events
- Foundation for future team-specific OAuth integration

**Dependencies:** None (external integration)

---

## Dependency Graph

```
Phase 18: Navigation Redesign
    |
    +-- Phase 19: Announcements
    +-- Phase 22: Practice Flow
    |
Phase 20: Public Issue Reporting
    |
Phase 21: Equipment Readiness
    |
Phase 23: Dashboard Enhancements <-- Phase 22

Phase 24: RC Public API (independent)
```

## Execution Order

**Wave 1:** Phase 18 (Navigation) — foundational layout change
**Wave 2:** Phase 19 (Announcements), Phase 20 (Issue Reporting), Phase 24 (RC API) — parallel
**Wave 3:** Phase 21 (Equipment Readiness), Phase 22 (Practice Flow) — parallel
**Wave 4:** Phase 23 (Dashboard) — needs data from 21 and 22

## Progress

```
Phase 18: [##########] 100% — Complete
Phase 19: [##########] 100% — Complete
Phase 20: [##########] 100% — Complete
Phase 21: [##########] 100% — Complete (6 plans)
Phase 22: [##########] 100% — Complete (13 plans)
Phase 23: [##########] 100% — Complete (6 plans)
Phase 24: [          ] 0% — Not started
```

---
*Created: 2026-01-26 for v2.1 UX Refinement milestone*
