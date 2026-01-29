# Radl

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

**Current State:** v2.3 shipped. Ready for beta release.

## Core Value

**The ONE thing that must work:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Shipped Capabilities

### v2.3 Core Flow Testing (2026-01-29)

**20 requirements delivered across 4 phases:**

**Verified End-to-End Flows:**
- Onboarding: signup → email verify → create team → invite → join
- Practice: create → add blocks → drag-drop lineup → publish
- Equipment: add → assign to lineup → QR damage report → resolve

**Bug Fixes:**
- Signup redirect parameter handling
- Team creation ClubMembership record
- Invitation toast text accuracy
- Equipment empty state for new teams

**UX Polish:**
- Form validation standardized (onTouched mode)
- Actionable error messages with examples
- 44px mobile touch targets verified
- Settings page cleanup (removed non-functional Team Colors)

### v2.2 Security Audit (2026-01-29)

**33 requirements delivered across 3 phases:**

- API authentication — 88 routes audited, JWT verification, session management
- RBAC & tenant isolation — 163 tests (109 CASL, 17 API, 17 role propagation, 20 pgTAP)
- Secrets management — bundle scanner, CI/CD integration, SHA-256 API key hashing
- Audit logging — immutable logs, 8 auth event types, PERMISSION_DENIED tracking
- Rate limiting — auth endpoints (5/15min login, 3/hr signup), Upstash Redis integration

### v2.1 UX Refinement (2026-01-27)

**30 requirements delivered across 7 phases:**

- Navigation/Layout redesign — desktop sidebar + mobile bottom nav
- Announcements — coach broadcasts with priority levels
- Public issue reporting — QR-based damage reports (no login required)
- Equipment readiness — calculated status with maintenance workflow
- Practice flow — inline editing, block structure, drag-drop lineups
- Dashboard enhancements — role-specific widgets, usage trends
- Regatta Central integration — calendar display with caching

### v2.0 Commercial Readiness (2026-01-26)

**34 requirements delivered across 8 phases:**

<details>
<summary>v2.0 Details</summary>

**Facility Model (9 requirements)**
- Facility → club hierarchy with shared equipment ownership
- Equipment booking system with conflict detection
- Cross-club event scheduling
- Facility dashboard with aggregate statistics

**Mobile PWA (8 requirements)**
- Mobile-first responsive design (320px-414px tested)
- 44px minimum touch targets (WCAG 2.5.5)
- Offline-first with conflict resolution
- Swipe gestures, bottom sheets, app-like transitions

**UI/UX Polish (9 requirements)**
- shadcn/ui design system with dark mode
- Empty states, loading skeletons, error handling
- Command palette (Cmd+K) and keyboard shortcuts

**Security & RBAC (8 requirements)**
- 5-role hierarchy (FACILITY_ADMIN → CLUB_ADMIN → COACH → ATHLETE → PARENT)
- Tenant-scoped permissions with audit logging
- MFA for admin roles, SSO/SAML for enterprise

</details>

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
- @dnd-kit (drag-drop lineups)

**LOC:** ~136,000 TypeScript

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
| Block-based practices | Flexible structure for varied training sessions | Good — cleaner than monolithic form |
| @dnd-kit for lineups | React 19 compatible, accessible, performant | Good — smooth drag-drop experience |
| onTouched validation | Immediate feedback on field blur | Good — better UX than onSubmit |

## Future Milestone Goals

v3.0 candidates:
- Push notifications (NOTIF-01, NOTIF-02)
- Native mobile apps (iOS, Android)
- Season templates
- RC team-specific OAuth integration
- Email digest notifications
- Parent role with ParentAthleteLink

## Deferred Items

- **NOTIF-01**: Push notification for equipment damage (v3.0)
- **NOTIF-02**: Push notification for lineup published (v3.0)
- Season templates — reusable structures (v3.0)
- Email notifications — alternative to push
- Erg results tracking — Concept2 integration
- Attendance analytics — reporting and trends
- RC team-specific OAuth — requires credentials (v3.0)
- Dynamic team colors — color settings stored in DB, UI uses fixed emerald

## Out of Scope

- Financial tracking / payroll
- Inventory accounting
- Results database (Regatta Central handles)
- Registration/payment processing
- Public scoring
- Messaging-first workflows
- Social features

---
*Last updated: 2026-01-29 after v2.3 milestone shipped*
