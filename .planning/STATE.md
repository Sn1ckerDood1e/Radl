# Radl Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v3.1 Admin Panel

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v3.1 Admin Panel |
| Phase | Not started |
| Plan | — |
| Status | Defining requirements |
| Last activity | 2026-01-30 — Milestone v3.1 started |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
v2.2: [##########] 100% SHIPPED (2026-01-29) — 33/35 requirements
v2.3: [##########] 100% SHIPPED (2026-01-29) — 20/20 requirements
v3.0: [##########] 100% SHIPPED (2026-01-30) — 29/29 requirements
v3.1: [░░░░░░░░░░] 0% IN PROGRESS
```

**Total shipped:** 7 milestones, 35 phases, 189 requirements

## v3.1 Milestone Overview

**Goal:** Platform owner can manage all users, clubs, and memberships through a super-admin panel

**Target features:**
- Super admin role (separate from FACILITY_ADMIN)
- Admin dashboard at `/admin`
- User management (create, list, update, delete, password reset)
- Club management (create, list, update, delete)
- Membership management (add/remove users from clubs, assign roles)
- Admin creates users (replaces self-signup for initial onboarding)

## Shipped Milestones

### v3.0 Production Polish (2026-01-30)

**Delivered:** 29 requirements across 4 phases (32-35)

### v2.3 Core Flow Testing (2026-01-29)

**Delivered:** 20 requirements across 4 phases (28-31)

### v2.2 Security Audit (2026-01-29)

**Delivered:** 33 requirements across 3 phases (25-27)

### v2.1 UX Refinement (2026-01-27)

**Delivered:** 30 requirements across 7 phases (18-24)

### v2.0 Commercial Readiness (2026-01-26)

**Delivered:** 34 requirements across 8 phases (10-17)

### v1.1 Polish (2026-01-22)

**Delivered:** 9 requirements across 4 phases (6-9)

### v1.0 MVP (2026-01-22)

**Delivered:** 31 requirements across 5 phases (1-5), 79,737 LOC

## Accumulated Context

### Key Decisions

| Decision | Date | Outcome |
|----------|------|---------|
| Dual auth patterns coexist | 2026-01-29 | Both secure; migration is code quality, not security |
| 404 for cross-tenant access | 2026-01-29 | Prevents resource enumeration attacks |
| Database lookup per request | 2026-01-29 | Security over performance; immediate role propagation |
| Defense-in-depth immutability | 2026-01-29 | RLS + trigger to protect AuditLog |
| Server-side auth mandatory | 2026-01-29 | All auth flows through API routes for rate limiting |
| Per-action rate limiters | 2026-01-29 | Different auth actions need different limits |
| onTouched validation mode | 2026-01-29 | Immediate feedback on field blur, better UX |
| Safe area on wrapper not component | 2026-01-30 | pb-[env(safe-area-inset-bottom)] on nav wrapper keeps component reusable |
| Prisma cached in production | 2026-01-30 | Prevents connection pool exhaustion on Vercel |
| Supabase pooler port 6543 | 2026-01-30 | Required for serverless environments |

### Architecture Notes

- **Multi-tenant:** Facility -> club -> team hierarchy with JWT claims, RLS policies
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase + React 19
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **RBAC:** @casl/ability + @casl/prisma + @casl/react for isomorphic permissions
- **Design system:** shadcn/ui with Tailwind v4, zinc color scheme
- **Mobile:** @use-gesture/react, vaul for touch interactions
- **Drag-drop:** @dnd-kit for lineups
- **Form validation:** react-hook-form with mode: 'onTouched', reValidateMode: 'onChange'

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RLS security hardening | PENDING | 7 migrations ready (00010-00017) |
| Middleware Prisma removal | RESOLVED | 2026-01-30 - API key validation moved to routes |
| CASL migration | IDENTIFIED | 59 routes use legacy getClaimsForApiRoute pattern |

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-30 |
| Stopped at | Started v3.1 milestone definition |
| Resume with | Complete requirements definition |

---

*Last updated: 2026-01-30 (v3.1 milestone started)*
