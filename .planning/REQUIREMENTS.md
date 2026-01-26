# v2.1 UX Refinement Requirements

## Overview

**Milestone:** v2.1 UX Refinement
**Goal:** Elevate user experience with RIM-inspired features, improved navigation, and better practice workflows

**Inspiration:** RIM (RowReady) Base44 implementation — analyzed for UX patterns and feature parity

## Requirements

### RIM Feature Parity

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| ANN-01 | Announcements — Coach can create broadcasts with priority levels (info, warning, urgent) | Must | TBD |
| ANN-02 | Announcement display — Athletes see announcements on dashboard, sorted by priority | Must | TBD |
| ANN-03 | Practice-linked announcements — Announcements can be tied to specific practices | Should | TBD |
| ISS-01 | Public issue reporting — QR code links to report form without login | Must | TBD |
| ISS-02 | Issue form — Equipment selection, severity (minor/moderate/critical), category, description | Must | TBD |
| ISS-03 | Issue routing — Reports create maintenance alerts and update equipment status | Must | TBD |
| EQR-01 | Equipment readiness — Calculated status based on inspection days, alerts, lifecycle | Must | TBD |
| EQR-02 | Readiness indicators — Visual badges showing ready/inspect-soon/needs-attention | Must | TBD |
| EQR-03 | Maintenance workflow — Open → In Progress → Resolved with photos and notes | Should | TBD |
| DASH-01 | Dashboard analytics — Equipment usage trends over time | Should | TBD |
| DASH-02 | Fleet health overview — Aggregate readiness status across all equipment | Should | TBD |
| DASH-03 | Today's practices widget — Quick view of scheduled practices with coach coverage | Must | TBD |

### Navigation/Layout Redesign

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| NAV-01 | Desktop sidebar — Left navigation column with main sections | Must | TBD |
| NAV-02 | Master-detail pattern — Clicking nav item shows content in center area | Must | TBD |
| NAV-03 | Mobile bottom nav — Navigation bar at bottom of screen | Must | TBD |
| NAV-04 | Mobile content area — Selected content displays in main area above nav | Must | TBD |
| NAV-05 | Responsive breakpoint — Sidebar on desktop (≥768px), bottom nav on mobile (<768px) | Must | TBD |
| NAV-06 | Active state — Visual indicator for currently selected nav item | Must | TBD |

### Practice Flow Improvements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| PRC-01 | Inline editing — Edit practice details on-page, not separate form screens | Must | TBD |
| PRC-02 | Block-based structure — Practice divided into time blocks with types | Must | TBD |
| PRC-03 | Block types — Water, erg, land training, meeting with type-specific forms | Must | TBD |
| PRC-04 | Type-specific fields — Water blocks have boats/lineups, erg blocks have machines/workouts | Must | TBD |
| PRC-05 | Drag-drop lineups — See available athletes, drag into boat seats | Must | TBD |
| PRC-06 | Athlete availability — Visual indicator of who's assigned vs available | Must | TBD |
| PRC-07 | Workout display — Structured drills within blocks (intervals, pieces, steady state) | Should | TBD |
| PRC-08 | Block reordering — Drag blocks to change practice order | Should | TBD |

### Regatta Central Public API

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| RC-01 | Regatta schedules — Fetch upcoming regattas from RC public API | Must | TBD |
| RC-02 | Regatta display — Show regatta name, date, location, registration status | Must | TBD |
| RC-03 | Calendar integration — Regattas appear on team calendar | Should | TBD |
| RC-04 | API caching — Cache RC responses to avoid rate limits | Must | TBD |

## Traceability

| REQ-ID | Status | Phase | Verification |
|--------|--------|-------|--------------|
| ANN-01 | Complete | 19 | Human verified |
| ANN-02 | Complete | 19 | Human verified |
| ANN-03 | Complete | 19 | Human verified |
| ISS-01 | Complete | 20 | 20-VERIFICATION.md |
| ISS-02 | Complete | 20 | 20-VERIFICATION.md |
| ISS-03 | Complete | 20 | 20-VERIFICATION.md |
| EQR-01 | Pending | — | — |
| EQR-02 | Pending | — | — |
| EQR-03 | Pending | — | — |
| DASH-01 | Pending | — | — |
| DASH-02 | Pending | — | — |
| DASH-03 | Pending | — | — |
| NAV-01 | Complete | 18 | 18-VERIFICATION.md |
| NAV-02 | Complete | 18 | 18-VERIFICATION.md |
| NAV-03 | Complete | 18 | 18-VERIFICATION.md |
| NAV-04 | Complete | 18 | 18-VERIFICATION.md |
| NAV-05 | Complete | 18 | 18-VERIFICATION.md |
| NAV-06 | Complete | 18 | 18-VERIFICATION.md |
| PRC-01 | Pending | — | — |
| PRC-02 | Pending | — | — |
| PRC-03 | Pending | — | — |
| PRC-04 | Pending | — | — |
| PRC-05 | Pending | — | — |
| PRC-06 | Pending | — | — |
| PRC-07 | Pending | — | — |
| PRC-08 | Pending | — | — |
| RC-01 | Pending | — | — |
| RC-02 | Pending | — | — |
| RC-03 | Pending | — | — |
| RC-04 | Pending | — | — |

## Summary

**Total Requirements:** 30
- Must Have: 24
- Should Have: 6

**Feature Areas:**
- RIM Feature Parity: 12 requirements
- Navigation/Layout: 6 requirements
- Practice Flow: 8 requirements
- RC Public API: 4 requirements

---
*Created: 2026-01-26 for v2.1 UX Refinement milestone*
