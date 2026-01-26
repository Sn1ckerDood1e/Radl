# RowOps

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

**Current State:** v2.0 shipped. Commercial-ready with facility model, mobile PWA, design system, and hardened security. Ready for production deployment and commercial sale.

## Core Value

**The ONE thing that must work:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Shipped Capabilities

### v2.0 Commercial Readiness (2026-01-26)

**34 requirements delivered across 8 phases:**

**Facility Model (9 requirements)**
- Facility → club hierarchy with shared equipment ownership
- Equipment booking system with conflict detection
- Cross-club event scheduling
- Facility dashboard with aggregate statistics
- Club subscription oversight

**Mobile PWA (8 requirements)**
- Mobile-first responsive design (320px-414px tested)
- 44px minimum touch targets (WCAG 2.5.5)
- Offline-first with conflict resolution
- Swipe gestures, bottom sheets, app-like transitions

**UI/UX Polish (9 requirements)**
- shadcn/ui design system with dark mode
- Empty states, loading skeletons, error handling
- Command palette (Cmd+K) and keyboard shortcuts
- Onboarding flow for new users

**Security & RBAC (8 requirements)**
- 5-role hierarchy (FACILITY_ADMIN → CLUB_ADMIN → COACH → ATHLETE → PARENT)
- Tenant-scoped permissions with audit logging
- MFA for admin roles, SSO/SAML for enterprise
- API key management for integrations

### v1.1 Polish (2026-01-22)

- Regatta Central settings UI
- Equipment usage display
- Data export (CSV)

### v1.0 MVP (2026-01-22)

- Core practice planning with lineups
- Equipment management with readiness states
- PWA with offline support and push notifications
- Regatta mode with timeline view

## Who It's For

| Role | Primary Use | Access Level |
|------|-------------|--------------|
| **Facility Admin** | Manage shared equipment, oversee multiple clubs | Facility-level control |
| **Club Admin** | Manage club settings, invite coaches | Club-level admin |
| **Coach** | Plan practices, manage equipment, assign lineups | Full operational control |
| **Athlete** | View schedule, see assignments | Personal schedule |
| **Parent** | View child's schedule | Read-only |

## Current Codebase

**Tech Stack:**
- Next.js 16 + React 19
- Prisma 6 + PostgreSQL (Supabase)
- shadcn/ui + Tailwind v4
- Serwist (service worker) + Dexie.js (IndexedDB)
- CASL (permissions) + Supabase Auth (sessions)
- @use-gesture/react + vaul (mobile interactions)

**LOC:** ~111,682 TypeScript

**Architecture:**
- Multi-tenant: Facility → Club → Team hierarchy
- RLS policies for database-level tenant isolation
- JWT claims with facility_id, club_id, team_id
- PWA with offline sync, background mutations
- CASL abilities for isomorphic permission checks

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Facility model | Real-world orgs have shared boathouses | Good — Chattanooga scenario works |
| No-inheritance RBAC | FACILITY_ADMIN cannot create lineups without COACH role | Good — clear separation |
| shadcn/ui with Tailwind v4 | Copy-paste ownership, no runtime dependency | Good — flexible theming |
| RLS over application filtering | Database-level isolation prevents leaks | Good — connection pooling safe |
| Wave-based execution | Plans grouped by dependency for parallel execution | Good — fast delivery |

## Next Milestone Goals

v3.0 candidates:
- Push notifications (NOTIF-01, NOTIF-02)
- Native mobile apps (iOS, Android)
- Advanced analytics and reporting
- Season templates
- Equipment lifecycle tracking

## Deferred Items

- **NOTIF-01**: Coach notification for equipment damage
- **NOTIF-02**: Athlete notification for lineup published
- Season templates — reusable structures
- Email notifications — alternative to push
- Erg results tracking — Concept2 integration
- Attendance analytics — reporting and trends
- Equipment lifecycle tracking — maintenance schedules

## Out of Scope

- Financial tracking / payroll
- Inventory accounting
- Results database (Regatta Central handles)
- Registration/payment processing
- Public scoring
- Messaging-first workflows
- Social features

---
*Last updated: 2026-01-26 after v2.0 milestone shipped*
