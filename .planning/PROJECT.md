# Radl

## What This Is

A multi-tenant SaaS for rowing team operations — practice planning, equipment management, roster coordination, and race-day execution at regattas.

**Current State:** v2.2 shipped. Ready for beta testing.

## Core Value

**The ONE thing that must work:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

## Shipped Capabilities

### v2.2 Security Audit (2026-01-29)

**33 requirements delivered across 3 phases:**

**API Authentication (7 requirements)**
- All 88+ API routes require authentication
- JWT signature verification on every request
- JWT expiration enforcement
- JWT claims validation
- Session persistence across browser refresh
- Logout properly invalidates session
- Token refresh works without re-authentication

**RBAC Permissions (7 requirements)**
- FACILITY_ADMIN can only access facility-level operations
- CLUB_ADMIN can only access their club's data
- COACH can manage practices/equipment but not club settings
- ATHLETE can only view their own schedule and assignments
- CASL permissions enforced server-side
- Role changes propagate immediately

**Tenant Isolation (6 requirements)**
- RLS policies on core tenant tables
- RLS policies correctly filter by tenant
- Cross-tenant data access blocked
- JWT claims match data access patterns
- Prisma queries include tenant filtering
- API responses don't leak data from other tenants

**Secrets & Environment (5 requirements)**
- No secrets exposed in client-side JavaScript
- Environment variables properly scoped
- Supabase service role key not accessible from client
- API keys are hashed in database
- No hardcoded credentials in source code

**Audit Logging (5 requirements)**
- Authentication events logged
- Data modification events logged
- Permission denied events logged
- Logs include user ID, timestamp, and action details
- Logs are immutable

**Rate Limiting (5 requirements)**
- Login endpoint rate limited
- Signup endpoint rate limited
- Password reset endpoint rate limited
- Rate limit responses include proper headers
- Rate limiting is per-IP

### v2.1 UX Refinement (2026-01-27)

**30 requirements delivered across 7 phases:**

**Navigation/Layout (6 requirements)**
- Desktop sidebar with master-detail pattern
- Mobile bottom navigation bar
- Responsive breakpoint at 768px
- Active state indicators

**RIM Feature Parity (12 requirements)**
- Announcements — Coach broadcasts with priority levels (info, warning, urgent)
- Public issue reporting — QR code damage reports without login
- Equipment readiness — Calculated status with traffic-light badges
- Maintenance workflow — Resolution notes, inspection tracking
- Fleet health dashboard widget

**Practice Flow (8 requirements)**
- Inline editing — Edit practice details on-page
- Block-based structure — Water, erg, land, meeting blocks
- Type-specific forms — Lineups for water, workouts for erg
- Drag-drop lineups — Athletes into boat seats with @dnd-kit
- Workout builder — PM5-style intervals with templates
- Bulk operations — Create/delete multiple practices

**RC Public API (4 requirements)**
- Regatta schedules fetched from RC API
- Calendar integration with blue indicators
- Multi-day spanning bars
- 6-hour caching with stale-while-revalidate

### v2.0 Commercial Readiness (2026-01-26)

**34 requirements delivered across 8 phases:**

<details>
<summary>v2.0 Details</summary>

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

## Future Milestone Goals

v3.0 candidates:
- Push notifications (NOTIF-01, NOTIF-02)
- Native mobile apps (iOS, Android)
- Season templates
- RC team-specific OAuth integration
- Email digest notifications

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
*Last updated: 2026-01-29 after v2.2 milestone shipped*
