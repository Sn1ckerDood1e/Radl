# Roadmap: RowOps v1.1

**Milestone:** v1.1 Polish
**Goal:** Complete v1.0 UI gaps, surface collected data, add targeted notifications and data portability.
**Created:** 2026-01-21

## Overview

v1.1 is a polish release that fills UI gaps left in v1.0's rapid development. Four focused phases deliver: RC connection management UI, equipment usage visibility, expanded notifications, and data export capabilities. Each phase is independently deployable and verifiable.

## Phase 6: RC Settings UI

**Goal:** Coaches can manage their Regatta Central integration from within the app.

**Dependencies:** None (builds on existing RC infrastructure from v1.0)

**Requirements:**
- RC-09: Coach can view RC connection status in settings
- RC-10: Coach can connect/disconnect RC account via OAuth
- RC-11: Coach can trigger manual regatta import
- RC-12: Coach can toggle auto-sync on/off

**Success Criteria:**
1. Coach can see whether RC is connected (status indicator with account info or "not connected")
2. Coach can initiate OAuth flow and complete RC connection without leaving the app
3. Coach can disconnect RC account with confirmation dialog
4. Coach can trigger manual import and see import progress/results
5. Coach can enable/disable auto-sync with immediate feedback

---

## Phase 7: Equipment Usage Display

**Goal:** Coaches can see how equipment is being used (usage collected in v1.0 now surfaced).

**Dependencies:** Phase 6 (parallel execution possible)

**Requirements:**
- EQUIP-04: Coach can view usage history on equipment detail page
- EQUIP-05: Coach can see equipment usage summary on dashboard

**Success Criteria:**
1. Equipment detail page shows chronological usage log (date, practice/regatta, lineup)
2. Usage history is paginated or scrollable for equipment with extensive history
3. Dashboard shows usage summary (most used boats, recent activity, usage trends)
4. Usage data links back to the practice/regatta where equipment was used

---

## Phase 8: Notifications

**Goal:** Stakeholders receive timely alerts for equipment issues and lineup availability.

**Dependencies:** PWA infrastructure (v1.0 complete)

**Requirements:**
- NOTIF-01: Coach receives notification when equipment is marked damaged
- NOTIF-02: Athletes receive notification when lineup is published

**Success Criteria:**
1. When equipment status changes to damaged, coach receives push notification
2. Damage notification includes equipment name and who reported it
3. When lineup is published for a practice, assigned athletes receive push notification
4. Lineup notification includes practice date/time and athlete's boat assignment

---

## Phase 9: Data Export

**Goal:** Coaches can export operational data for external use (reporting, backup, sharing).

**Dependencies:** None (parallel execution possible)

**Requirements:**
- EXPORT-01: Coach can export equipment inventory to CSV/Excel
- EXPORT-02: Coach can export roster to CSV/Excel
- EXPORT-03: Coach can export season schedule to CSV/Excel

**Success Criteria:**
1. Equipment export includes all equipment fields (name, type, status, weight class, notes)
2. Roster export includes athlete info (name, weight, side, groups, eligibility status)
3. Schedule export includes practices and regattas with dates, times, and locations
4. All exports trigger immediate download with meaningful filename
5. Export format is compatible with Excel and Google Sheets

---

## Progress

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 6 | RC Settings UI | Manage RC integration from app | RC-09, RC-10, RC-11, RC-12 | Pending |
| 7 | Equipment Usage Display | Surface collected usage data | EQUIP-04, EQUIP-05 | Pending |
| 8 | Notifications | Alerts for damage and lineups | NOTIF-01, NOTIF-02 | Pending |
| 9 | Data Export | Export data for external use | EXPORT-01, EXPORT-02, EXPORT-03 | Pending |

**v1.1 Coverage:** 11/11 requirements mapped

---

## Previous Milestones

- **v1.0 MVP** — Phases 1-5 (shipped 2026-01-22) — [archived](milestones/v1.0-ROADMAP.md)

---
*Roadmap created: 2026-01-21*
