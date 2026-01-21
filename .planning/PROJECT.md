# RowOps

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

## Core Value

**The ONE thing that must work:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Who It's For

| Role | Primary Use | Access Level |
|------|-------------|--------------|
| **Coach** | Plan practices, manage equipment, assign lineups, run regatta mode | Full control |
| **Athlete** | View schedule, see assignments, receive notifications, acknowledge races | Personal schedule + assignments |
| **Parent** | View child's schedule and race times | Read-only, invite/athlete-linked |

## Problem Being Solved

Rowing teams juggle:
- Complex equipment (shells, oars, launches) that must be available and undamaged
- Rosters that change by season and eligibility
- Practices with water/land/erg blocks requiring different assignment models
- Race-day chaos at regattas with multiple events, scattered athletes, and unreliable connectivity

Current state: The app has basic CRUD for equipment and roster, but it's **administrative, not operational**. Equipment isn't tied to practices. Roster doesn't show who can row today. No scheduling. No lineups. No regatta support.

## Target State

### Milestone 1: Equipment & Roster Flows (Operational)

**Equipment becomes operational:**
- Usage logs auto-generated from practice assignments
- Readiness state derived from: damage reports + maintenance flags + manual overrides
- Availability enforced at assignment time (damaged/unavailable boats can't be assigned)

**Roster becomes contextual:**
- Three states: On team → Eligible (season-scoped) → Assigned (practice-scoped)
- Practice view shows: assigned / unassigned / ineligible
- Season container groups practices, regattas, templates
- Athletes can be active/inactive per season (supports redshirting, alumni history)

### Milestone 2: Scheduling & Lineups

**Practice structure:**
- Time (date, start/end, repeating via templates)
- Blocks (warm-up, steady state, pieces, land work, erg)
- Block metadata: single/interval, time/distance, tagged (water/land/erg)

**Assignment model:**
- Water blocks: Define lineup first (athletes + seats), then assign compatible available boat
- Land/erg blocks: Group-based assignment (e.g., "Varsity Group A — 5k erg test")
- Manual override allowed (pick specific boat first if desired)
- Results stored per athlete (erg scores, attendance)

**Templates:**
- Reusable practice templates (e.g., "Tuesday Steady State")
- Reusable lineup templates (e.g., "Varsity 1V standard")

**Schedule view:**
- Unified calendar: practices, regattas, races

### Milestone 3: Regatta Mode

**What it is:** Temporary operational state for race-day execution at competitions.

**Regatta Central integration:**
- Per-team API keys (OAuth2, encrypted at rest)
- Search/select regattas
- Pull team's entries and race schedule
- Manual entry also supported

**Race-day flow:**
1. Coach sees timeline of team's races (from Regatta Central)
2. For each entry, coach assigns lineup (fresh or from template)
3. Coach sets: notification timing, meeting location for rigging/launch
4. Coach adds notes (helper athletes, special instructions)
5. Athletes receive push notifications before their race
6. Same athlete can race in multiple events

**Offline capability:**
- Cached schedules and lineups
- Read-only offline access
- Queued outbound actions
- Real-time updates are best-effort

**What it is NOT:**
- Results database
- Registration/payment system
- Public scoring tool
- Full race management

### Milestone 4: Issues & Fixes

"Make the foundation safe and boring before adding more features."

- Security: auth, permissions, data isolation
- Tech debt from codebase analysis
- Stability/correctness issues that block scaling

## Constraints

| Constraint | Detail |
|------------|--------|
| **Platform** | PWA (web + service workers), no native app for v1 |
| **Offline** | Required for regatta mode (unreliable cellular at venues) |
| **Multi-tenant** | Single deployed instance, tenant IDs enforce isolation |
| **Notifications** | Push (service workers) + optional email, all configurable |
| **External API** | Regatta Central v4, per-team API keys |

## Domain Model

**Boat types:** Standard rowing configs (1x, 2x, 2-, 4+, 4-, 4x, 8+, etc.) with fixed seat counts.

**Coxswains:** Athletes with a special position flag, not a separate role.

**Events:** Follow standard rowing nomenclature (e.g., "Varsity Men's 8+", "JV Women's 4+").

**Seasons:** Container for practices, regattas, templates. Eligibility is season-scoped.

## Data Retention

| Data Type | Retention | Post-Season |
|-----------|-----------|-------------|
| Practice data | Archived after season | Read-only, deletable by admin |
| Lineups | Always retained | Read-only, useful for history |
| Equipment usage logs | Long-term | Never auto-deleted, exportable |

## Requirements

### Validated

- [x] **AUTH-EXISTING**: Multi-tenant authentication with JWT claims — *existing*
- [x] **EQUIP-CRUD**: Equipment create/read/update/delete — *existing*
- [x] **EQUIP-DAMAGE**: Damage reporting with QR codes — *existing*
- [x] **ROSTER-CRUD**: Team member management — *existing*
- [x] **ROSTER-INVITE**: Invitations (email/CSV/team code) — *existing*
- [x] **NOTIF-INAPP**: In-app notification bell — *existing*

### Active

#### Milestone 1: Equipment & Roster
- [ ] **EQUIP-USAGE**: Auto-generate usage logs from practice assignments
- [ ] **EQUIP-READY**: Readiness state (damage + maintenance + overrides)
- [ ] **EQUIP-AVAIL**: Availability enforcement at assignment time
- [ ] **ROSTER-ELIG**: Season-scoped eligibility
- [ ] **ROSTER-ASSIGN**: Practice-scoped assignment status
- [ ] **SEASON-MGMT**: Season container with practice/regatta grouping

#### Milestone 2: Scheduling & Lineups
- [ ] **PRAC-STRUCT**: Practice with time + blocks (water/land/erg)
- [ ] **PRAC-BLOCKS**: Block types with interval/time/distance metadata
- [ ] **ASSIGN-WATER**: Lineup-first assignment for water blocks
- [ ] **ASSIGN-LAND**: Group-based assignment for land/erg blocks
- [ ] **LINEUP-TMPL**: Reusable lineup templates
- [ ] **PRAC-TMPL**: Reusable practice templates
- [ ] **SCHED-VIEW**: Unified calendar (practices, regattas, races)

#### Milestone 3: Regatta Mode
- [ ] **REG-CONNECT**: Regatta Central API integration (per-team keys)
- [ ] **REG-MANUAL**: Manual regatta/race entry
- [ ] **REG-TIMELINE**: Timeline view of team's races
- [ ] **REG-LINEUP**: Lineup assignment per entry (fresh or template)
- [ ] **REG-NOTIFY**: Push notifications with configurable timing
- [ ] **REG-LOCATION**: Meeting location for rigging/launch
- [ ] **REG-NOTES**: Notes field for helpers/instructions
- [ ] **REG-OFFLINE**: Offline capability (cached schedules, queued actions)

#### Milestone 4: Issues & Fixes
- [ ] **SEC-AUTH**: Fix JWT claims verification gaps
- [ ] **SEC-RATE**: Add rate limiting to sensitive endpoints
- [ ] **SEC-ISOLATION**: Verify tenant data isolation
- [ ] **DEBT-DRY**: Extract duplicated claims fetching pattern
- [ ] **DEBT-FORMS**: Refactor oversized form components
- [ ] **PERF-CACHE**: Add query caching for stable data
- [ ] **PERF-N1**: Fix N+1 queries in roster loading

### Out of Scope

- Financial tracking / payroll — not a team management focus
- Inventory accounting — equipment is operational, not financial
- Checkout systems unrelated to practices — equipment tied to practices only
- Results database — Regatta Central handles official results
- Registration/payment — out of scope for internal execution tool
- Public scoring — not a spectator-facing app
- Messaging-first workflows — not a communication platform
- Social features — not a social network
- Native mobile apps — PWA sufficient for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native | Coaches use laptop/tablet, athletes use phone browser. Service workers handle push + offline. | Pending |
| Lineup-first assignment | Coaches think in people and seats, boats are constraints. Easier template reuse. | Pending |
| Per-team Regatta Central keys | Each team connects own account. Keys encrypted at rest, scoped to tenant. | Pending |
| Season-scoped eligibility | Supports redshirting, alumni history, roster changes without user deletion. | Pending |
| Group-based land/erg | Individual overrides optional. Results stored per athlete. | Pending |

---
*Last updated: 2026-01-20 after initialization*
