# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.0 Commercial Readiness — facility model, mobile PWA, UI/UX polish, security hardening

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.0 |
| Phase | Not started (defining requirements) |
| Status | Gathering requirements |
| Last activity | 2026-01-22 — Milestone v2.0 started |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [          ] 0% — defining requirements
```

## v2.0 Scope

**Goal:** Prepare RowOps for commercial sale to rowing organizations

**Target features:**
1. **Facility Model** — Facility-level tenancy with shared equipment between clubs
2. **Mobile PWA** — Responsive, touch-friendly, app-like, architect for native
3. **UI/UX Polish** — Modern design + intuitive workflows
4. **Security Hardening** — Roles audit, permissions, multi-tenant confidence

**Priority:** Mobile > Facility Model > UI/UX > Security (but all must ship)

**Real-world scenario:** Chattanooga Rowing (boathouse) hosts Lookout Rowing Club and Chattanooga Juniors. Each club has subscription, some boats are shared.

## Shipped Milestones

### v1.1 Polish (2026-01-22)

**Delivered:**
- RC Settings UI (status display, OAuth connect/disconnect, manual import, auto-sync toggle)
- Equipment usage display (history on detail page, summary on list page)
- Data export (equipment, roster, schedule to CSV)

**Deferred:**
- NOTIF-01: Push notification for equipment damage
- NOTIF-02: Push notification for lineup published

### v1.0 MVP (2026-01-22)

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:** 5 phases, 37 plans, 31 requirements, 79,737 LOC, 3 days

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Toast notifications:** Sonner (dark theme, bottom-right, rich colors)
- **Data export:** CSV with proper escaping, immediate download

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for future milestone |

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

---

*Last updated: 2026-01-22 (v2.0 milestone started)*
