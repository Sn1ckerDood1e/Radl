# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Planning next milestone (v2.0)

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.0 complete, v2.0 pending |
| Phase | None active |
| Plan | None active |
| Status | Ready to plan next milestone |
| Last activity | 2026-01-22 — v1.0 milestone complete |

**Progress:**
```
v1.0: [##########] 100% SHIPPED

Phase 1: [##########] 100% (5/5 plans) COMPLETE
Phase 2: [##########] 100% (8/8 plans) COMPLETE
Phase 3: [##########] 100% (9/9 plans) COMPLETE
Phase 4: [##########] 100% (7/7 plans) COMPLETE
Phase 5: [##########] 100% (8/8 plans) COMPLETE

Overall v1.0: 37/37 plans (100%)
```

## v1.0 Summary

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:**
- 5 phases, 37 plans
- 31 requirements implemented
- 79,737 LOC TypeScript
- 3 days (2026-01-20 → 2026-01-22)

**Archived:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

## Next Steps

Run `/gsd:new-milestone` to start v2.0 planning. This will:
1. Gather user priorities through questioning
2. Research implementation approaches
3. Define v2.0 requirements
4. Create new roadmap

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| DEBT-01: Claims helper | COMPLETE | v1.0 |
| DEBT-02: Form refactoring | COMPLETE | v1.0 |
| DEBT-03: Query caching | COMPLETE | v1.0 |
| RC import UI | Deferred | APIs exist, needs UI |
| Equipment usage display | Deferred | Data collected, needs UI |

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

---

*Last updated: 2026-01-22 (v1.0 milestone complete)*
