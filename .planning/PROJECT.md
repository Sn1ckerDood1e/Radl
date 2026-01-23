# RowOps

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

**Current State:** v1.1 shipped. Starting v2.0 commercial readiness — facility model, mobile PWA, UI/UX polish, and security hardening.

## Core Value

**The ONE thing that must work:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Current Milestone: v2.0 Commercial Readiness

**Goal:** Prepare RowOps for commercial sale to rowing organizations with proper multi-facility architecture, mobile-first experience, and hardened security.

**Target features:**
1. **Facility Model** — Support facility-level tenancy (boathouses) with multiple clubs sharing equipment
2. **Mobile PWA** — Responsive design, touch-friendly, app-like experience, architect for future native
3. **UI/UX Polish** — Modern visual design + intuitive workflows
4. **Security Hardening** — Comprehensive roles audit, permissions review, multi-tenant confidence

**Real-world scenario:** Chattanooga Rowing (boathouse/foundation) hosts Lookout Rowing Club and Chattanooga Juniors Rowing. Each club needs its own subscription, but some boats are shared facility equipment.

## Who It's For

| Role | Primary Use | Access Level |
|------|-------------|--------------|
| **Coach** | Plan practices, manage equipment, assign lineups, run regatta mode | Full control |
| **Athlete** | View schedule, see assignments, receive notifications, acknowledge races | Personal schedule + assignments |
| **Parent** | View child's schedule and race times | Read-only, invite-linked |
| **Facility Admin** | Manage shared equipment, oversee multiple clubs | Facility-level control |

## Current Codebase

**Tech Stack:**
- Next.js 16 + React 19
- Prisma 6 + PostgreSQL (Supabase)
- Serwist (service worker) + Dexie.js (IndexedDB)
- Supabase Edge Functions (push notifications)
- dnd-kit (drag-and-drop)
- date-fns-tz (timezone handling)
- Sonner (toast notifications)

**LOC:** ~80,840 TypeScript

**Architecture:**
- Multi-tenant with JWT claims (team_id in all queries)
- PWA with offline data sync and background mutations
- Regatta Central integration (OAuth2, encrypted tokens)
- CSV export for equipment, roster, schedule

## Requirements

### Validated (v1.0 + v1.1)

**v1.0 — Core Platform:**
- [x] **SEC-01**: Fix JWT claims verification gaps
- [x] **SEC-02**: Add rate limiting to sensitive endpoints
- [x] **SEC-03**: Audit and verify multi-tenant data isolation
- [x] **SEASON-01**: Create season container model
- [x] **SEASON-02**: Implement season-scoped eligibility
- [x] **PRAC-01**: Create practices with time blocks
- [x] **PRAC-02**: Add block metadata
- [x] **PRAC-03**: Create reusable practice templates
- [x] **PRAC-04**: Build unified calendar view
- [x] **LINE-01**: Build lineup editor
- [x] **LINE-02**: Implement boat assignment
- [x] **LINE-03**: Create reusable lineup templates
- [x] **LINE-04**: Implement group-based assignment
- [x] **EQUIP-01**: Auto-generate usage logs
- [x] **EQUIP-02**: Implement readiness state
- [x] **EQUIP-03**: Enforce availability at assignment
- [x] **PWA-01**: Set up service worker with caching
- [x] **PWA-02**: Implement push notifications
- [x] **PWA-03**: Add IndexedDB offline storage
- [x] **PWA-04**: Implement background sync
- [x] **REG-01**: Integrate Regatta Central API
- [x] **REG-02**: Support manual regatta/race entry
- [x] **REG-03**: Build timeline view
- [x] **REG-04**: Enable lineup assignment per entry
- [x] **REG-05**: Implement race notifications
- [x] **REG-06**: Add meeting location field
- [x] **REG-07**: Add notes field
- [x] **REG-08**: Build offline capability
- [x] **DEBT-01**: Extract claims helper utility
- [x] **DEBT-02**: Refactor oversized form components
- [x] **DEBT-03**: Add query caching

**v1.1 — Polish:**
- [x] **RC-09**: Coach can view RC connection status in settings
- [x] **RC-10**: Coach can connect/disconnect RC account via OAuth *(UI complete, needs credentials)*
- [x] **RC-11**: Coach can trigger manual regatta import *(UI complete, needs credentials)*
- [x] **RC-12**: Coach can toggle auto-sync on/off
- [x] **EQUIP-04**: Coach can view usage history on equipment detail page
- [x] **EQUIP-05**: Coach can see equipment usage summary on list page
- [x] **EXPORT-01**: Export equipment inventory to CSV
- [x] **EXPORT-02**: Export roster to CSV
- [x] **EXPORT-03**: Export season schedule to CSV

### Active (v2.0)

**Goal:** Commercial readiness — facility model, mobile PWA, UI/UX polish, security hardening

*(Requirements to be defined after research)*

### Deferred (Future Milestone)

- **NOTIF-01**: Coach receives notification when equipment is marked damaged
- **NOTIF-02**: Athletes receive notification when lineup is published
- Season templates — reusable season structures
- Email notifications — alternative to push
- Erg results tracking — Concept2 integration
- Attendance analytics — reporting and trends
- Equipment lifecycle tracking — maintenance schedules
- Parent portal — read-only access for parents

### Out of Scope

- Financial tracking / payroll — not a team management focus
- Inventory accounting — equipment is operational, not financial
- Checkout systems unrelated to practices — equipment tied to practices only
- Results database — Regatta Central handles official results
- Registration/payment — out of scope for internal execution tool
- Public scoring — not a spectator-facing app
- Messaging-first workflows — not a communication platform
- Social features — not a social network

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
| Sonner for toasts | Dark theme, bottom-right, rich colors | Good — consistent UX |
| Facility model for v2.0 | Real-world orgs have shared boathouses with multiple clubs | — Pending |

## Constraints

| Constraint | Detail |
|------------|--------|
| **Platform** | PWA (web + service workers), architect for future native |
| **Offline** | Required for regatta mode (unreliable cellular at venues) |
| **Multi-tenant** | Facility → Club hierarchy, equipment can be shared |
| **Notifications** | Push (service workers) + optional email, all configurable |
| **External API** | Regatta Central v4, per-team API keys |
| **Commercial** | Must be sellable — security, UX, and mobile must be production-quality |

---
*Last updated: 2026-01-22 after v2.0 milestone started*
