# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Phase 2 - Practice Scheduling (Plan 01 complete)

## Current Position

| Field | Value |
|-------|-------|
| Phase | 2 of 5 (Practice Scheduling) |
| Plan | 1 of 6 complete |
| Status | In progress |
| Last activity | 2026-01-21 - Completed 02-01-PLAN.md |

**Progress:**
```
Phase 1: [##########] 100% (5/5 plans) COMPLETE
Phase 2: [##........] 17% (1/6 plans)
Phase 3: [..........] 0%
Phase 4: [..........] 0%
Phase 5: [..........] 0%

Overall:  [###....... ] 7/31 requirements (23%)
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements completed | 7/31 |
| Plans completed | 6 |
| Plans failed | 0 |
| Blockers resolved | 0 |

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Security first | Existing JWT gaps are active vulnerabilities. Cannot add features handling lineup/attendance data without fixing. | 1 |
| Scheduling before Lineups | Lineups are assigned to practice sessions. Data model dependency. | 2, 3 |
| Offline before Regatta | Regatta mode is primary use case for offline. Building regatta features without offline infrastructure would require rework. | 4, 5 |
| 5 phases (standard depth) | Research suggested 6 phases, consolidated push notifications into PWA phase for coherent delivery. | All |
| Claims helper returns tuple | Returns { user, claims, error } for simpler destructuring at call sites | 1 |
| Error refs only on 500s | Auth/permission errors (401/403/404) don't need refs since they're expected states | 1 |
| Rate limit before auth | For anonymous endpoints, rate limit check runs before auth to prevent brute-force even without valid credentials | 1 |
| Graceful rate limit fallback | When Upstash env vars not configured, rate limiting disabled (not broken) for development-friendly behavior | 1 |
| Soft delete seasons by archiving | Preserve historical data and relationships (practices, regattas, eligibility) | 1 |
| Multiple active seasons allowed | Teams may run overlapping programs (Fall Racing, Novice Training) | 1 |
| Athletes see missing requirements | Clear visibility into what's blocking eligibility improves athlete experience | 1 |
| Upsert on eligibility PATCH | Creates record if not exists, simplifying coach workflow | 1 |
| Global error uses inline styles | CSS unavailable when layout crashes, so inline styles required | 1 |
| Error reference IDs for users | Displaying digest helps support workflows without exposing stack traces | 1 |
| DateTime for practice times | Practice uses full DateTime for startTime/endTime, templates use HH:MM strings | 2 |
| Position-based block ordering | Blocks use position Int rather than time slots for flexible ordering | 2 |
| DRAFT/PUBLISHED practice status | DRAFT visible only to coaches, PUBLISHED to all team members | 2 |

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering (no RLS yet)
- **Auth:** Supabase SSR client + JWT claims for team context
- **Auth pattern:** `getClaimsForApiRoute()` uses `getUser()` before `getSession()` (security fix)
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA stack:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Error handling:** Route-level error.tsx + global-error.tsx with reference IDs
- **Practice models:** Practice, PracticeBlock, PracticeTemplate, TemplateBlock, BlockTemplate

### Tech Debt Tracker

| Item | Status | Phase |
|------|--------|-------|
| DEBT-01: Claims helper utility | **COMPLETE** | 1 |
| DEBT-02: Refactor oversized forms | Pending | 3 |
| DEBT-03: Query caching | Pending | 4 |

### Patterns Established

| Pattern | Usage | Files |
|---------|-------|-------|
| API auth pattern | `const { user, claims, error } = await getClaimsForApiRoute(); if (error \|\| !user) return unauthorizedResponse();` | All API routes |
| Team guard | `if (!claims?.team_id) return forbiddenResponse('No team associated with user');` | Team-scoped routes |
| Role guard | `if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can...');` | Coach-only routes |
| Rate-limit-first | `const clientIp = getClientIp(request); const rateLimit = await checkRateLimit(clientIp, 'action');` | Anonymous/sensitive endpoints |
| Soft-delete-archive | `status: 'ARCHIVED'` instead of hard delete | Season, Equipment |
| Role-based-visibility | Different data returned based on user_role (coach sees all, athlete sees self) | Eligibility endpoints |
| Route error boundary | `'use client'` + useEffect logging + friendly UI with reset | src/app/error.tsx |
| Global error boundary | Inline styles, html/body wrapper, minimal recovery UI | src/app/global-error.tsx |
| Position-based ordering | `position Int` field with `[parentId, position]` index | PracticeBlock, TemplateBlock |
| Template pattern | Template models mirror instance models with default values | PracticeTemplate, BlockTemplate |

### Todos

- None yet

### Blockers

- Node.js 18.x doesn't meet Next.js 16 requirement (20.9.0+) - using tsc for verification

## Phase 1 Completion Summary

All 6 requirements for Phase 1 verified complete:

| REQ-ID | Description | Status |
|--------|-------------|--------|
| SEC-01 | Fix JWT claims verification gaps | COMPLETE |
| SEC-02 | Add rate limiting to sensitive endpoints | COMPLETE |
| SEC-03 | Audit and verify multi-tenant data isolation | COMPLETE |
| SEASON-01 | Create season container model | COMPLETE |
| SEASON-02 | Implement season-scoped eligibility | COMPLETE |
| DEBT-01 | Extract claims helper utility | COMPLETE |

## Phase 2 Progress

| Plan | Description | Status |
|------|-------------|--------|
| 02-01 | Data models for Practice, Blocks, Templates | COMPLETE |
| 02-02 | Practice CRUD API | Pending |
| 02-03 | Block management API | Pending |
| 02-04 | Damage reporting integration | Pending |
| 02-05 | Template system API | Pending |
| 02-06 | Calendar UI | Pending |

## Session Continuity

### Last Session

- **Date:** 2026-01-21
- **Activity:** Executed 02-01-PLAN.md (Practice Data Models)
- **Outcome:** Prisma schema extended with Practice, PracticeBlock, templates; Zod validations created

### Next Actions

1. Continue Phase 2: Practice Scheduling
2. Plan 02-02: Practice CRUD API

### Files Modified This Session

- `prisma/schema.prisma` (created - Practice, PracticeBlock, PracticeTemplate, TemplateBlock, BlockTemplate, Regatta models)
- `src/lib/validations/practice.ts` (created)
- `src/lib/validations/template.ts` (created)
- `.planning/phases/02-practice-scheduling/02-01-SUMMARY.md` (created)

---

*Last updated: 2026-01-21*
