# RowOps Roadmap

## Overview

RowOps v1 transforms an existing administrative app into an operational platform where coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in. The roadmap follows research-recommended sequencing: security fixes first, then scheduling, lineups, PWA infrastructure, and finally regatta mode which requires all prior capabilities.

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Phases

### Phase 1: Security & Foundation

**Goal:** The application has a secure multi-tenant foundation with season-scoped data organization.

**Dependencies:** None (starting point)

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md - Extract claims helper and refactor API routes for consistent auth
- [x] 01-02-PLAN.md - Add rate limiting to damage reports and join endpoints
- [x] 01-03-PLAN.md - Create Season and AthleteEligibility data models with CRUD API
- [x] 01-04-PLAN.md - Create eligibility management API for coaches and athletes
- [x] 01-05-PLAN.md - Add error boundaries and verify all security requirements

**Requirements:**
| REQ-ID | Description |
|--------|-------------|
| SEC-01 | Fix JWT claims verification gaps |
| SEC-02 | Add rate limiting to sensitive endpoints |
| SEC-03 | Audit and verify multi-tenant data isolation |
| SEASON-01 | Create season container model |
| SEASON-02 | Implement season-scoped eligibility |
| DEBT-01 | Extract claims helper utility |

**Success Criteria:**
1. Coach cannot access another team's data even with manipulated JWT claims
2. Unauthenticated users are rate-limited on damage report and join endpoints (max 10 attempts per IP per hour)
3. Coach can create a season and see practices grouped by season
4. Coach can mark athletes as eligible/ineligible for a specific season
5. JWT claims are validated through a single reusable utility across all API routes

---

### Phase 2: Practice Scheduling

**Goal:** Coaches can create and manage practices with structured time blocks and equipment availability.

**Dependencies:** Phase 1 (seasons model required for practice grouping)

**Plans:** 8 plans (6 original + 2 gap closure)

Plans:
- [x] 02-01-PLAN.md - Data models for Practice, PracticeBlock, templates, and equipment readiness
- [x] 02-02-PLAN.md - Practice CRUD API with block management
- [x] 02-03-PLAN.md - Equipment readiness state (derived availability)
- [x] 02-04-PLAN.md - Template system API (practice and block templates)
- [x] 02-05-PLAN.md - Practice management UI with block editor
- [x] 02-06-PLAN.md - Unified calendar view with equipment availability
- [x] 02-07-PLAN.md - Template system UI (gap closure)
- [x] 02-08-PLAN.md - Equipment availability in practice form (gap closure)

**Requirements:**
| REQ-ID | Description |
|--------|-------------|
| PRAC-01 | Create practices with time blocks |
| PRAC-02 | Add block metadata |
| PRAC-03 | Create reusable practice templates |
| PRAC-04 | Build unified calendar view |
| EQUIP-02 | Implement readiness state |
| EQUIP-03 | Enforce availability at assignment |

**Success Criteria:**
1. Coach can create a practice with date, start/end time, and multiple blocks (water, land, erg)
2. Coach can see equipment marked unavailable (damaged/maintenance) when planning a practice
3. Coach can save a practice structure as a template and apply it to create new practices
4. Coach and athlete can view a unified calendar showing all practices and regattas for a season

---

### Phase 3: Lineup Management

**Goal:** Coaches can define lineups with seat assignments and assign compatible equipment.

**Dependencies:** Phase 2 (practices required for lineup assignment context)

**Plans:** 9 plans

Plans:
- [x] 03-01-PLAN.md - Data models for Lineup, SeatAssignment, templates, and usage logging
- [x] 03-02-PLAN.md - Lineup CRUD API with seat management
- [x] 03-03-PLAN.md - Equipment usage logging (auto-generate on boat assignment)
- [x] 03-04-PLAN.md - Install dnd-kit and create drag-drop foundation components
- [x] 03-05-PLAN.md - Water lineup builder with drag-drop seat assignment
- [x] 03-06-PLAN.md - Land/erg assignment UI with multi-select
- [x] 03-07-PLAN.md - Lineup template system (save/apply templates)
- [x] 03-08-PLAN.md - Integrate lineup editor into practice UI and template pages
- [x] 03-09-PLAN.md - Refactor oversized form components (DEBT-02)

**Requirements:**
| REQ-ID | Description |
|--------|-------------|
| LINE-01 | Build lineup editor |
| LINE-02 | Implement boat assignment |
| LINE-03 | Create reusable lineup templates |
| LINE-04 | Implement group-based assignment |
| EQUIP-01 | Auto-generate usage logs |
| DEBT-02 | Refactor oversized form components |

**Success Criteria:**
1. Coach can define a lineup by selecting athletes and assigning them to seat positions
2. Coach can assign a compatible boat to a lineup and system prevents incompatible assignments (wrong size, unavailable)
3. Coach can save a lineup as a template and apply it to water blocks in future practices
4. Coach can assign athlete groups to land/erg blocks without individual seat positions
5. Equipment usage log is automatically created when a boat is assigned to a practice lineup

---

### Phase 4: PWA Infrastructure

**Goal:** The application works offline with cached data and syncs changes when reconnected.

**Dependencies:** Phase 3 (lineups/schedules must exist to be cached)

**Requirements:**
| REQ-ID | Description |
|--------|-------------|
| PWA-01 | Set up service worker with caching |
| PWA-02 | Implement push notifications |
| PWA-03 | Add IndexedDB offline storage |
| PWA-04 | Implement background sync |
| DEBT-03 | Add query caching |

**Success Criteria:**
1. Athlete can view their schedule and lineup assignments when device has no network connection
2. Athlete receives push notification when assigned to a lineup or practice is updated
3. Coach can make changes offline and changes sync automatically when connection is restored
4. App shell loads instantly even on slow connections (cached service worker)

---

### Phase 5: Regatta Mode

**Goal:** Coaches can manage race-day operations with imported schedules, lineup assignments, and athlete notifications.

**Dependencies:** Phase 4 (offline capability and push notifications required)

**Requirements:**
| REQ-ID | Description |
|--------|-------------|
| REG-01 | Integrate Regatta Central API |
| REG-02 | Support manual regatta/race entry |
| REG-03 | Build timeline view |
| REG-04 | Enable lineup assignment per entry |
| REG-05 | Implement race notifications |
| REG-06 | Add meeting location field |
| REG-07 | Add notes field |
| REG-08 | Build offline capability |

**Success Criteria:**
1. Coach can connect Regatta Central account and import team's race schedule for an upcoming regatta
2. Coach can manually create regatta entries for events not on Regatta Central
3. Coach can view timeline of team's races and assign lineups to each entry
4. Athlete receives push notification with meeting location before their race (configurable timing)
5. Coach and athlete can view regatta schedule and lineup assignments without network connection at venue

---

## Progress

| Phase | Status | Requirements | Completed |
|-------|--------|--------------|-----------|
| 1 - Security & Foundation | Complete | 6 | 6 |
| 2 - Practice Scheduling | Complete | 6 | 6 |
| 3 - Lineup Management | Complete | 6 | 6 |
| 4 - PWA Infrastructure | Not Started | 5 | 0 |
| 5 - Regatta Mode | Not Started | 8 | 0 |

**Total:** 18/31 requirements completed (58%)

---

## Research Flags

Phases that may need deeper research during planning:

| Phase | Flag | Reason |
|-------|------|--------|
| 4 | Background Sync | Only 80% browser coverage (no Safari/Firefox). Hybrid fallback needed. |
| 5 | Regatta Central API | Limited documentation. PKCE support unverified. May need server-side OAuth. |

---

*Roadmap created: 2026-01-20*
*Depth: standard (5 phases)*
*Coverage: 31/31 requirements mapped*
*Phase 1 planned: 2026-01-20*
*Phase 2 planned: 2026-01-21*
*Phase 2 complete: 2026-01-21*
*Phase 3 planned: 2026-01-21*
*Phase 3 complete: 2026-01-21*
