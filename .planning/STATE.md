# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v1.1 Polish — RC settings UI, equipment usage display, notifications, data export

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.1 |
| Phase | All phases built |
| Status | Cautiously approved — deferred items noted |
| Last activity | 2026-01-22 — Export functionality added |

**Progress:**
```
v1.0: [##########] 100% SHIPPED
v1.1: [########  ] 82% (4 phases, 11 requirements)
      Phase 6: RC Settings UI — UI complete (RC credentials needed for testing)
      Phase 7: Equipment Usage Display — COMPLETE
      Phase 8: Notifications — DEFERRED (push notifications for damage/lineup)
      Phase 9: Data Export — COMPLETE
```

## v1.0 Summary

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:**
- 5 phases, 37 plans
- 31 requirements implemented
- 79,737 LOC TypeScript
- 3 days (2026-01-20 → 2026-01-22)

**Archived:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

## v1.1 Scope

**Goal:** Polish v1.0 — complete UI gaps, surface collected data, add notifications and data portability.

**Phases:**
| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 6 | RC Settings UI | 4 | UI Complete (needs RC credentials) |
| 7 | Equipment Usage Display | 2 | Complete |
| 8 | Notifications | 2 | Deferred |
| 9 | Data Export | 3 | Complete |

## Deferred Items

| Item | Reason | Priority |
|------|--------|----------|
| RC connection testing | Needs RC_CLIENT_ID and RC_CLIENT_SECRET from Regatta Central API registration | When RC credentials obtained |
| QR code external scanning | Localhost not accessible from mobile devices | When deployed to production |
| Push notifications (Phase 8) | NOTIF-01 (damage alerts), NOTIF-02 (lineup published) | Future milestone |

## Next Steps

1. Obtain Regatta Central API credentials to test RC connection
2. Deploy to production for QR code testing
3. Plan Phase 8 (Notifications) for future milestone

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

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| DEBT-01: Claims helper | COMPLETE | v1.0 |
| DEBT-02: Form refactoring | COMPLETE | v1.0 |
| DEBT-03: Query caching | COMPLETE | v1.0 |
| RC import UI | v1.1 COMPLETE | Phase 6: Settings page built, needs credentials |
| Equipment usage display | v1.1 COMPLETE | Phase 7: Detail page + list page summary |
| Data export | v1.1 COMPLETE | Phase 9: Equipment, roster, schedule CSV export |
| Push notifications | DEFERRED | Phase 8: Damage alerts, lineup published |

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

## Session Continuity

**Last session:** 2026-01-22 05:12:11 UTC
**Stopped at:** Completed 06-01-PLAN.md
**Resume file:** None

---

*Last updated: 2026-01-22 (Plan 06-01 complete)*
