# RowOps

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

**Current State:** v2.0 shipped. Starting v2.1 UX refinement — RIM feature parity, navigation redesign, practice flow improvements, RC public API.

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

## Current Milestone: v2.1 UX Refinement

**Goal:** Elevate user experience with RIM-inspired features, improved navigation, and better practice workflows.

**Target features:**

1. **RIM Feature Parity**
   - Announcements — Coach broadcasts to team with priority levels
   - Public issue reporting — QR-based damage reports (no login required)
   - Equipment readiness — Calculated status with maintenance workflow
   - Dashboard analytics — Equipment insights, usage trends, fleet health

2. **Navigation/Layout Redesign**
   - Desktop: Left sidebar nav → content in center (master-detail pattern)
   - Mobile: Bottom navigation bar → content in main area

3. **Practice Flow Improvements**
   - Inline editing — Edit on-page, not separate form screens
   - Block-based structure — Time blocks with type-specific forms
   - Improved lineup creation — See available athletes, drag into boats
   - Workout display — Structured drills within practice blocks

4. **Regatta Central Public API**
   - Regatta schedules — Upcoming regattas, dates, locations
   - Foundation for later team-specific OAuth integration

## Future Milestone Goals

v3.0 candidates:
- Push notifications (NOTIF-01, NOTIF-02)
- Native mobile apps (iOS, Android)
- Season templates
- RC team-specific OAuth integration

## Deferred Items

- **NOTIF-01**: Push notification for equipment damage (v3.0)
- **NOTIF-02**: Push notification for lineup published (v3.0)
- Season templates — reusable structures (v3.0)
- Email notifications — alternative to push
- Erg results tracking — Concept2 integration
- Attendance analytics — reporting and trends
- RC team-specific OAuth — requires credentials (v3.0)

## Out of Scope

- Financial tracking / payroll
- Inventory accounting
- Results database (Regatta Central handles)
- Registration/payment processing
- Public scoring
- Messaging-first workflows
- Social features

---
*Last updated: 2026-01-26 after v2.1 milestone started*
