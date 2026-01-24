# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.0 Commercial Readiness — facility model, mobile PWA, UI/UX polish, security hardening

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.0 Commercial Readiness |
| Phase | Phase 15: Mobile PWA Improvements |
| Plan | 4 of 6 |
| Status | In progress |
| Last activity | 2026-01-24 — Completed 15-04-PLAN.md |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [########  ] 53% — Phase 15 in progress (18/34 requirements)
```

**Current Phase Detail:**
- Phase 15: Mobile PWA Improvements — IN PROGRESS (4/6 plans)
- Completed: Core dependencies (@use-gesture/react, vaul), Drawer, view transitions, useSyncStatus hook, SyncStatusIndicator, useSwipeGesture hook, SwipeableListItem, useMediaQuery, ResponsiveMenu

**Previous Phases:**
- Phase 14: Design System Foundation — COMPLETE (4/4 plans)
- Phase 13: Facility Auth Integration — COMPLETE (6/6 plans)
- Phase 12: Facility Schema Migration — COMPLETE (7/7 plans)
- Phase 11: MFA & SSO — COMPLETE (12/12 plans)

## v2.0 Scope

**Goal:** Prepare RowOps for commercial sale to rowing organizations

**Phases:** 10-17 (8 phases total)

**Target features:**
1. **Facility Model** — Facility-level tenancy with shared equipment between clubs
2. **Mobile PWA** — Responsive, touch-friendly, app-like, architect for native
3. **UI/UX Polish** — Modern design + intuitive workflows
4. **Security Hardening** — Roles audit, permissions, multi-tenant confidence

**Real-world scenario:** Chattanooga Rowing (boathouse) hosts Lookout Rowing Club and Chattanooga Juniors. Each club has subscription, some boats are shared.

**Phase structure:**
- Phase 10-11: Security foundation (RBAC, MFA, SSO)
- Phase 12-13: Facility model (schema, auth integration)
- Phase 14: Design system foundation
- Phase 15: Mobile PWA improvements (parallel with 13-14)
- Phase 16: UI/UX polish
- Phase 17: Facility UI features

**Critical path:** Phase 10 → 12 → 13 → 17
**Parallel opportunities:** Phase 15 (Mobile) can run with Phases 13-14

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

**v2.0 decisions:**
- Security foundation first (all features depend on stable hierarchical auth)
- Expand-migrate-contract for schema (backward compatibility for team-only installs)
- JWT claims extension (minimal change to existing auth)
- shadcn/ui over full framework (copy-paste ownership, no runtime dependency)
- Mobile parallel with auth (no dependency, can run simultaneously)
- Facility UI last (requires complete foundation)
- No-inheritance RBAC: FACILITY_ADMIN cannot create lineups without explicit COACH role
- Zinc color scheme for shadcn/ui (matches existing --surface palette)
- Map shadcn variables to existing theme rather than replace (--color-primary uses --team-primary, not new variable)
- Preserve original CSS structure, use @theme inline for Tailwind v4 mapping only
- Use class-variance-authority for component variant management (type-safe with IntelliSense)
- Enable ESLint deprecation tracking for component migration safety
- Include mobile touch target styles for WCAG 2.5.5 compliance (44px minimum)
- ThemeToggle uses DropdownMenu pattern for compact header integration (icon button trigger with sr-only label)

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Toast notifications:** Sonner (dark theme, bottom-right, rich colors)
- **Data export:** CSV with proper escaping, immediate download

**v2.0 additions (implemented in Phase 10):**
- **RBAC:** @casl/ability + @casl/prisma + @casl/react for isomorphic permissions
- **Audit logging:** 13 auditable actions with 365-day retention
- **API keys:** sk_ prefix, SHA-256 hash, admin UI for management
- **Multi-club:** ClubMembership model with roles[] array, cookie-based context

**v2.0 additions (implemented in Phase 12):**
- **Facility model:** Facility table with profile fields (location, contact, branding, billing)
- **FacilityMembership:** Facility-level roles with FACILITY_ADMIN support
- **Equipment ownership:** EquipmentOwnerType enum (FACILITY, CLUB, TEAM) with hierarchy fields
- **RLS helpers:** 8 functions for JWT claim extraction and role checking (facility_id, club_id, has_role, has_any_role)
- **JWT claims hook:** custom_access_token_hook injects facility_id, club_id, user_roles with TeamMember fallback
- **Data migration:** SQL to create Facility wrappers for Teams and set Equipment ownership
- **RLS policies:** 13 policies for Facility, FacilityMembership, Equipment with hierarchical visibility
- **Facility context helpers:** Cookie-based facility context with DB and JWT fallback chain in claims helper

**v2.0 additions (implemented in Phase 13):**
- **viewMode permissions:** FACILITY_ADMIN permissions scope based on viewMode (facility vs club drill-down)
- **Extended UserContext:** facilityId and viewMode fields for hierarchical access control
- **Facility subject:** Added to CASL subjects for facility profile management
- **Context switch API:** Unified /api/context/switch endpoint for facility and club view switching
- **ViewMode derivation:** Computed from cookie state in getClaimsForApiRoute (facilityId + clubId combination)
- **Context validation:** Auto-recovery for invalid club/facility cookies with first-available membership fallback
- **Login restoration:** validateAndRecoverContext and restoreLastContext for continuity across sessions
- **Context switcher UI:** ContextSwitcher component with facility and club views, JWT refresh, router cache invalidation
- **Available contexts API:** /api/context/available returns facility, clubs, currentContext
- **Dashboard layout integration:** AbilityProvider wrapping dashboard children, SSR context hydration for header
- **Onboarding flow:** /onboarding page for users without memberships

**v2.0 additions (implemented in Phase 14):**
- **Design system foundation:** shadcn/ui with Tailwind v4, zinc color scheme
- **CSS variable mapping:** shadcn namespace mapped to existing theme (--color-card uses --surface-2, --color-primary uses --team-primary)
- **Component utilities:** cn() function for className composition with clsx + tailwind-merge
- **Animation library:** tw-animate-css for Tailwind v4 animation support
- **Core components:** Button, Dialog, Select, Input, DropdownMenu with Radix UI primitives
- **Variant system:** class-variance-authority for type-safe component variants
- **Mobile accessibility:** WCAG 2.5.5 touch targets (44px minimum on mobile)
- **Component migration tracking:** ESLint @deprecated rule for safe migrations

**v2.0 additions (implemented in Phase 15):**
- **Touch gestures:** @use-gesture/react for mobile touch interactions
- **Bottom sheets:** vaul-based Drawer component for mobile menus and action sheets
- **View transitions:** Next.js experimental.viewTransition for smooth page navigation
- **Sync status:** useSyncStatus hook combining online/pending/syncing/error states with triggerSync action
- **Network indicator:** SyncStatusIndicator component with dropdown details (hidden when online with no pending)
- **Swipe gestures:** useSwipeGesture hook wrapping useDrag for horizontal swipe-to-reveal
- **Swipeable lists:** SwipeableListItem component for mobile swipe actions (delete/edit)
- **Media queries:** useMediaQuery hook with SSR support for responsive detection
- **Responsive menus:** ResponsiveMenu component adapting Drawer (mobile) and DropdownMenu (desktop)

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for future milestone |

**v2.0 mitigation:**
- Component migration tracking (Phase 14) to prevent drift
- RLS connection pooling tests (Phase 12) to prevent leaks
- Tenant-aware cache keys (Phase 15) to prevent cross-tenant data exposure

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

### Research Flags for v2.0

**Phases needing deeper research during planning:**
- **Phase 13:** Custom Access Token Hook with Supabase Edge Functions (memory/timeout constraints)
- **Phase 17:** Equipment reservation conflict detection (partial boat availability logic)

**Standard patterns (skip research-phase):**
- **Phase 11:** MFA with Supabase Auth, SSO/SAML integration
- **Phase 14:** shadcn/ui installation
- **Phase 15:** PWA offline-first, touch gestures
- **Phase 16:** Standard UI/UX patterns

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-24 |
| Stopped at | Completed 15-04-PLAN.md |
| Resume file | None |

---

*Last updated: 2026-01-24 (15-03, 15-04 complete)*
