# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Between milestones — v1.1 completed, run `/gsd:new-milestone` to start next

## Current Position

| Field | Value |
|-------|-------|
| Milestone | None (between milestones) |
| Last Completed | v1.1 Polish |
| Status | Ready for next milestone |
| Last activity | 2026-01-22 — v1.1 milestone completed |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
```

## Shipped Milestones

### v1.1 Polish (2026-01-22)

**Delivered:**
- RC Settings UI (status display, OAuth connect/disconnect, manual import, auto-sync toggle)
- Equipment usage display (history on detail page, summary on list page)
- Data export (equipment, roster, schedule to CSV)

**Deferred:**
- NOTIF-01: Push notification for equipment damage
- NOTIF-02: Push notification for lineup published
- RC connection testing (needs RC_CLIENT_ID and RC_CLIENT_SECRET)
- QR code external scanning (needs production deployment)

**Stats:** 4 phases, 13 commits, 80,840 LOC

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
| DEBT-01: Claims helper | COMPLETE | v1.0 |
| DEBT-02: Form refactoring | COMPLETE | v1.0 |
| DEBT-03: Query caching | COMPLETE | v1.0 |
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for future milestone |

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

## Next Steps

Run `/gsd:new-milestone` to:
1. Define next milestone scope
2. Create new REQUIREMENTS.md
3. Create new ROADMAP.md with phases

---

*Last updated: 2026-01-22 (v1.1 milestone completed)*
