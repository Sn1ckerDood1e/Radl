# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Multi-tenant Next.js application with server-client split architecture

**Key Characteristics:**
- Multi-tenant at the team level - all data scoped to teams
- Server components (RSCs) handle auth, data fetching, layout
- Client components isolated to forms and interactive elements
- Supabase for auth + Prisma for database access
- API routes for server-side business logic
- Middleware-based auth enforcement with public/protected routes

## Layers

**Authentication & Authorization:**
- Purpose: Manage user identity and team-role based access control
- Location: `src/lib/auth/authorize.ts`, `src/middleware.ts`
- Contains: Auth helpers (`requireAuth`, `requireTeam`, `requireRole`), JWT claim decoding, role checkers
- Depends on: Supabase for user verification, Prisma for team membership lookups
- Used by: All protected routes, API handlers, server components

**Database & ORM:**
- Purpose: Persistent storage with type-safe queries
- Location: `src/lib/prisma.ts`, `prisma/schema.prisma`
- Contains: Prisma client singleton, multi-tenant schema definitions (Team, TeamMember, Equipment, etc.)
- Depends on: PostgreSQL via environment variables
- Used by: All API routes, server components, auth layer

**Supabase Integration:**
- Purpose: Authentication and session management
- Location: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Contains: Server-side client (cookie-based), client-side client (browser storage)
- Depends on: Supabase environment variables
- Used by: Middleware, auth helpers, login/signup flows

**API Layer:**
- Purpose: Server-side business logic for CRUD operations and team-scoped data access
- Location: `src/app/api/` (subdirectories by resource: teams, athletes, equipment, invitations, notifications, etc.)
- Contains: Route handlers implementing GET, POST, PATCH, DELETE
- Depends on: Auth helpers, Prisma, request validation schemas
- Used by: Client components via fetch, mobile apps potentially
- Pattern: Each handler validates auth + team membership, uses JWT claims for team scope

**Validation Layer:**
- Purpose: Type-safe request validation and TypeScript inference
- Location: `src/lib/validations/` (auth.ts, team.ts, equipment.ts, athlete.ts, etc.)
- Contains: Zod schemas for forms, API requests
- Depends on: Zod library
- Used by: Forms, API routes, client components

**UI Layer:**
- Purpose: Server-rendered layouts and client-interactive components
- Location: `src/app/` (Next.js App Router), `src/components/`
- Contains:
  - Page components (server, async) in `src/app/[path]/page.tsx`
  - Layout components (server) in `src/app/[path]/layout.tsx`
  - Client components in `src/components/` and `*-client.tsx` files
- Depends on: Supabase, Prisma, auth helpers
- Patterns:
  - Server page components call `requireAuth()` or `requireTeam()`
  - Server pages fetch team data and pass serialized JSON to client components
  - Client components (`'use client'`) handle forms, state, and interactivity

**Utility Layer:**
- Purpose: Shared helper functions
- Location: `src/lib/utils/`
- Contains: Slug generation, team code generation, type utilities
- Used by: Forms, API routes, validators

## Data Flow

**Team Creation Flow:**

1. User (unauthenticated) visits `/signup`, creates account via Supabase
2. Redirected to `/` which calls `requireAuth()` and finds no team
3. Redirected to `/create-team`
4. `CreateTeamForm` client component calls `POST /api/teams` with name + colors
5. API handler verifies user is authenticated, validates input, creates Team + TeamMember in transaction
6. Form uploads logo to Supabase Storage, patches team with logoUrl
7. Client calls `supabase.auth.refreshSession()` to update JWT claims with team_id
8. Router redirects to `/{team.slug}` dashboard

**Data Access Flow (Protected Routes):**

1. Request enters middleware
2. Middleware calls `supabase.auth.getUser()` to verify session
3. If public route (login, signup, join/[code], report) → allow
4. If protected route and no user → redirect to login
5. Page component calls `requireTeam()` which:
   - Gets authenticated user from Supabase
   - Decodes JWT to extract team_id and user_role
   - Falls back to Prisma lookup if JWT stale
   - Validates team slug matches user's team
6. Page fetches team-scoped data with Prisma using team_id
7. Server renders page, passes data to client components
8. Client components render without re-fetching (data already in props)

**Equipment Management Flow:**

1. Coach visits `/{teamSlug}/equipment`
2. Server component calls `requireTeam()` to get team_id and verify role
3. Fetches equipment list from Prisma: `Equipment.findMany({ where: { teamId } })`
4. Passes serialized equipment to `EquipmentListClient`
5. Coach clicks "Add Equipment"
6. `EquipmentForm` client component submits `POST /api/equipment` with validation
7. API handler:
   - Verifies user authenticated and has team_id in claims
   - Checks role is COACH
   - Validates equipment data with Zod schema
   - Creates Equipment record with teamId
8. Form refreshes list or refetches from API

**Invitation & Team Joining:**

1. Coach creates invitation: `POST /api/invitations` with email + role
2. API creates Invitation record (email-based or code-based)
3. Invited user visits join link: `/join/[code]` or receives email (TODO: not implemented)
4. Join client component handles acceptance:
   - Anonymous or unauthenticated user can submit join request
   - Creates or updates Invitation with userId
5. Coach reviews and approves on Invitations page
6. On approval, system creates TeamMember record linking user to team

**State Management:**

- **Server-side:** Prisma queries, JWT claims in cookies (Supabase)
- **Client-side:** React state in forms, no global state manager (context providers for theme)
- **Cross-cut:** Team colors stored in TeamColorProvider context, persisted in Team model
- **Multi-tenant scoping:** All Prisma queries filter by teamId; extracted from JWT claims or DB lookup
- **JWT claims:** team_id, user_role, email - refreshed on login, used for fast authorization

## Key Abstractions

**Team (Multi-tenant Root):**
- Purpose: Partition all application data
- Examples: `prisma/schema.prisma` (Team model), `src/app/(dashboard)/[teamSlug]` (routing)
- Pattern: URL slug-based routing, team_id in all queries, team_id in JWT claims

**TeamMember + Role-Based Access:**
- Purpose: Associate users with teams and define permissions
- Examples: `src/lib/auth/authorize.ts` (requireRole, canViewRoster), `src/app/api/equipment/route.ts` (COACH check)
- Pattern: 3 roles (COACH, ATHLETE, PARENT), explicit checks at route/component level

**Supabase Auth + JWT Claims:**
- Purpose: Decoupled auth provider, claims as fast path to team context
- Examples: `src/middleware.ts`, `src/lib/auth/authorize.ts` (getUserClaims)
- Pattern: getUser() for verification, getSession().access_token for claims, database fallback for freshness

**Invitation Model:**
- Purpose: Support both email invites and team code joins
- Examples: `prisma/schema.prisma` (Invitation model), `src/app/join/[code]/page.tsx`
- Pattern: Pending status until accepted, PENDING/ACCEPTED/REVOKED lifecycle

**Equipment as Tenant Asset:**
- Purpose: Track team's boats, oars, launches with damage reporting
- Examples: `src/app/api/equipment/route.ts`, `src/app/(dashboard)/[teamSlug]/equipment/page.tsx`
- Pattern: Equipment → DamageReport relationship, status enums (ACTIVE/INACTIVE/RETIRED)

## Entry Points

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every request
- Responsibilities: Verify Supabase session, enforce public/protected routes, preserve auth cookies

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All routes
- Responsibilities: Setup ThemeProvider, fonts, metadata

**Home Page (Auth Router):**
- Location: `src/app/page.tsx`
- Triggers: Authenticated users visiting `/`
- Responsibilities: Redirect logged-in users to dashboard or team creation

**Dashboard Layout:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: All dashboard routes (protected)
- Responsibilities: Call requireAuth, fetch team info, render DashboardHeader, apply team colors

**Dashboard Index:**
- Location: `src/app/(dashboard)/[teamSlug]/page.tsx`
- Triggers: Team dashboard visits
- Responsibilities: requireRole check, fetch team stats (equipment count, roster count, damage reports), render cards

**API Route Handlers:**
- Locations: `src/app/api/teams/route.ts`, `src/app/api/equipment/route.ts`, `src/app/api/athletes/route.ts`, `src/app/api/invitations/route.ts`
- Triggers: Fetch requests from client components
- Responsibilities: Auth validation, Prisma CRUD, response serialization

## Error Handling

**Strategy:** Explicit checks at boundaries (middleware, auth helpers, API routes), redirect on auth failure, JSON errors on API

**Patterns:**

- **Authentication missing:** Middleware redirects to `/login`, auth helpers call `redirect()` (server throw)
- **Authorization failed:** API routes return 403 JSON, page components call `redirect()`
- **Validation error:** API routes return 400 JSON with Zod error details
- **Database error:** Catch block logs, returns 500 JSON with generic message
- **Team mismatch:** Server components redirect to dashboard (safety check)
- **Client-side errors:** Forms catch fetch errors, set local state for error messages

## Cross-Cutting Concerns

**Logging:** console.error in API handlers and catch blocks, no centralized logger configured

**Validation:** Zod schemas in `src/lib/validations/`, applied in API handlers and client forms via react-hook-form + zodResolver

**Authentication:** Supabase SSR client (cookies) in middleware and server components, Supabase browser client in client components, JWT claims for fast team context

**Tenant Isolation:** teamId field on all tenant-scoped tables, Prisma where clauses always filter by teamId extracted from claims/DB, no RLS policies yet (application-level enforcement)

**File Uploads:** Supabase Storage for team logos and athlete photos, paths namespaced by teamId or equipmentId

---

*Architecture analysis: 2026-01-20*
