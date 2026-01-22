# RowOps

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

**Current State:** v1.0 shipped with full operational capabilities. Coaches can plan practices with lineups and equipment, athletes receive push notifications and can view schedules offline at race venues.

## Core Value

**The ONE thing that must work:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Who It's For

| Role | Primary Use | Access Level |
|------|-------------|--------------|
| **Coach** | Plan practices, manage equipment, assign lineups, run regatta mode | Full control |
| **Athlete** | View schedule, see assignments, receive notifications, acknowledge races | Personal schedule + assignments |
| **Parent** | View child's schedule and race times | Read-only, invite/athlete-linked |

## Current Codebase

**Tech Stack:**
- Next.js 16 + React 19
- Prisma 6 + PostgreSQL (Supabase)
- Serwist (service worker) + Dexie.js (IndexedDB)
- Supabase Edge Functions (push notifications)
- dnd-kit (drag-and-drop)
- date-fns-tz (timezone handling)

**LOC:** ~80,000 TypeScript

**Architecture:**
- Multi-tenant with JWT claims (team_id in all queries)
- PWA with offline data sync and background mutations
- Regatta Central integration (OAuth2, encrypted tokens)

## Requirements

### Validated (v1.0)

- [x] **SEC-01**: Fix JWT claims verification gaps — v1.0
- [x] **SEC-02**: Add rate limiting to sensitive endpoints — v1.0
- [x] **SEC-03**: Audit and verify multi-tenant data isolation — v1.0
- [x] **SEASON-01**: Create season container model — v1.0
- [x] **SEASON-02**: Implement season-scoped eligibility — v1.0
- [x] **PRAC-01**: Create practices with time blocks — v1.0
- [x] **PRAC-02**: Add block metadata — v1.0
- [x] **PRAC-03**: Create reusable practice templates — v1.0
- [x] **PRAC-04**: Build unified calendar view — v1.0
- [x] **LINE-01**: Build lineup editor — v1.0
- [x] **LINE-02**: Implement boat assignment — v1.0
- [x] **LINE-03**: Create reusable lineup templates — v1.0
- [x] **LINE-04**: Implement group-based assignment — v1.0
- [x] **EQUIP-01**: Auto-generate usage logs — v1.0
- [x] **EQUIP-02**: Implement readiness state — v1.0
- [x] **EQUIP-03**: Enforce availability at assignment — v1.0
- [x] **PWA-01**: Set up service worker with caching — v1.0
- [x] **PWA-02**: Implement push notifications — v1.0
- [x] **PWA-03**: Add IndexedDB offline storage — v1.0
- [x] **PWA-04**: Implement background sync — v1.0
- [x] **REG-01**: Integrate Regatta Central API — v1.0
- [x] **REG-02**: Support manual regatta/race entry — v1.0
- [x] **REG-03**: Build timeline view — v1.0
- [x] **REG-04**: Enable lineup assignment per entry — v1.0
- [x] **REG-05**: Implement race notifications — v1.0
- [x] **REG-06**: Add meeting location field — v1.0
- [x] **REG-07**: Add notes field — v1.0
- [x] **REG-08**: Build offline capability — v1.0
- [x] **DEBT-01**: Extract claims helper utility — v1.0
- [x] **DEBT-02**: Refactor oversized form components — v1.0
- [x] **DEBT-03**: Add query caching — v1.0

### Active (v2.0)

None yet — run `/gsd:new-milestone` to define v2.0 requirements.

**Candidates from v1.0 tech debt:**
- RC import UI (APIs ready, need settings page)
- Equipment usage display (data collected, no UI)
- Additional notification triggers (join/damage)

**Candidates from v2 backlog:**
- Season templates
- Email notifications
- Erg results tracking
- Attendance analytics
- Equipment lifecycle tracking
- Parent portal

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
| PWA over native | Coaches use laptop/tablet, athletes use phone browser. Service workers handle push + offline. | Good — works well |
| Lineup-first assignment | Coaches think in people and seats, boats are constraints. Easier template reuse. | Good — natural flow |
| Per-team Regatta Central keys | Each team connects own account. Keys encrypted at rest, scoped to tenant. | Good — proper isolation |
| Season-scoped eligibility | Supports redshirting, alumni history, roster changes without user deletion. | Good — flexible |
| Group-based land/erg | Individual overrides optional. Results stored per athlete. | Good — simple UX |
| dnd-kit for drag-drop | Modern, accessible, well-maintained library | Good — smooth UX |
| Serwist for service worker | Production-tested caching strategies | Good — reliable offline |
| AES-256-CBC for RC tokens | Industry standard encryption | Good — secure |

## Constraints

| Constraint | Detail |
|------------|--------|
| **Platform** | PWA (web + service workers), no native app for v1 |
| **Offline** | Required for regatta mode (unreliable cellular at venues) |
| **Multi-tenant** | Single deployed instance, tenant IDs enforce isolation |
| **Notifications** | Push (service workers) + optional email, all configurable |
| **External API** | Regatta Central v4, per-team API keys |

---
*Last updated: 2026-01-22 after v1.0 milestone*
