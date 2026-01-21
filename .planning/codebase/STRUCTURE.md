# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
rowops/
├── prisma/
│   ├── migrations/           # Database migration files
│   └── schema.prisma         # Prisma ORM schema (multi-tenant models)
├── public/                   # Static assets (icons, images)
├── src/
│   ├── app/                  # Next.js App Router (pages, API routes, layouts)
│   │   ├── (auth)/           # Auth pages layout group
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/      # Protected dashboard layout group
│   │   │   ├── [teamSlug]/   # Dynamic team routes
│   │   │   │   ├── page.tsx             # Team dashboard home
│   │   │   │   ├── roster/              # Team members
│   │   │   │   ├── equipment/           # Equipment inventory
│   │   │   │   ├── invitations/         # Invitation management
│   │   │   │   ├── notifications/       # Alert center
│   │   │   │   └── settings/            # Team settings
│   │   │   ├── create-team/
│   │   │   │   └── page.tsx             # Team creation form
│   │   │   └── layout.tsx               # Dashboard wrapper
│   │   ├── api/              # API route handlers
│   │   │   ├── teams/        # Team CRUD
│   │   │   ├── athletes/     # Team member profiles
│   │   │   ├── equipment/    # Equipment inventory
│   │   │   ├── invitations/  # Invitation management
│   │   │   ├── auth/         # Auth callback
│   │   │   ├── join/         # Team code join endpoint
│   │   │   ├── notifications/# Notification API
│   │   │   └── team-settings/# Settings API
│   │   ├── join/             # Public join route
│   │   │   └── [code]/       # Team code join page
│   │   ├── report/           # Public damage report route
│   │   │   └── [equipmentId]/
│   │   ├── layout.tsx        # Root layout (providers, fonts, metadata)
│   │   └── page.tsx          # Home redirect (auth router)
│   ├── components/           # Reusable UI components
│   │   ├── athletes/         # Athlete profile components
│   │   │   ├── athlete-card.tsx
│   │   │   └── athlete-form.tsx
│   │   ├── equipment/        # Equipment management components
│   │   │   ├── equipment-card.tsx
│   │   │   ├── equipment-detail.tsx
│   │   │   ├── equipment-form.tsx
│   │   │   ├── damage-report-form.tsx
│   │   │   ├── damage-history.tsx
│   │   │   └── qr-code-display.tsx
│   │   ├── forms/            # Shared form components
│   │   │   ├── create-team-form.tsx
│   │   │   ├── csv-import-form.tsx
│   │   │   └── invite-member-form.tsx
│   │   ├── layout/           # Layout components
│   │   │   └── dashboard-header.tsx
│   │   ├── notifications/    # Notification components
│   │   │   └── notification-bell.tsx
│   │   └── providers/        # Context providers
│   │       ├── theme-provider.tsx
│   │       └── team-color-provider.tsx
│   ├── generated/
│   │   └── prisma/           # Auto-generated Prisma client types
│   ├── lib/                  # Utility & helper modules
│   │   ├── auth/
│   │   │   └── authorize.ts  # Auth helpers (requireAuth, requireTeam, requireRole)
│   │   ├── supabase/
│   │   │   ├── server.ts     # Server-side Supabase client (cookies)
│   │   │   └── client.ts     # Client-side Supabase client (browser)
│   │   ├── validations/      # Zod schemas for forms and API validation
│   │   │   ├── auth.ts
│   │   │   ├── team.ts
│   │   │   ├── athlete.ts
│   │   │   ├── equipment.ts
│   │   │   ├── invitation.ts
│   │   │   └── damage-report.ts
│   │   ├── utils/            # Utility functions
│   │   │   ├── slug.ts
│   │   │   └── team-code.ts
│   │   └── prisma.ts         # Prisma client singleton
│   ├── middleware.ts         # Next.js request middleware (auth enforcement)
│   └── globals.css           # Global Tailwind styles
├── supabase/
│   └── migrations/           # Database migration files
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variable template
└── .planning/                # GSD planning docs
    ├── phases/               # Phase implementation docs
    └── codebase/             # This codebase analysis (ARCHITECTURE.md, etc.)
```

## Directory Purposes

**prisma/**
- Purpose: ORM schema and database migrations
- Contains: `schema.prisma` (Team, TeamMember, Equipment, DamageReport, AthleteProfile, Invitation, etc.), migration SQL files
- Key files: `prisma/schema.prisma` (multi-tenant models), `prisma/migrations/` (version history)

**src/app/**
- Purpose: Next.js App Router pages, layouts, and API routes
- Contains: Server component pages, layout wrappers, route handlers
- Organized by feature: auth routes, protected team routes, public join/report routes, API endpoints

**src/app/(auth)/**
- Purpose: Unauthenticated user flows
- Contains: Login and signup pages
- Key files: `login/page.tsx` (Supabase password auth), `signup/page.tsx` (email verification)

**src/app/(dashboard)/**
- Purpose: Authenticated user interface
- Contains: Team dashboard, roster, equipment, invitations, settings
- Pattern: `[teamSlug]` dynamic segment for multi-tenant routing
- Key files: `[teamSlug]/page.tsx` (dashboard home), layout.tsx (auth + header wrapper)

**src/app/api/**
- Purpose: Server-side business logic and data access
- Contains: Route handlers implementing REST-like endpoints
- Sub-folders: `teams/`, `athletes/`, `equipment/`, `invitations/`, `notifications/`, `team-settings/`, `auth/`, `join/`
- Pattern: Each handler validates auth + team membership, uses JWT claims for scoping

**src/app/join/**
- Purpose: Public team code join flow
- Contains: Join form, team code validation
- Key files: `[code]/page.tsx` (join page component), route handler

**src/app/report/**
- Purpose: Public damage report submission (via QR code)
- Contains: Damage report form accessible without login
- Key files: `[equipmentId]/page.tsx`

**src/components/**
- Purpose: Reusable React components
- Organized by domain: athletes, equipment, forms, layout, notifications, providers
- Pattern: Co-locate `-client.tsx` for client-only components (e.g., `roster-client.tsx`)

**src/lib/auth/**
- Purpose: Authentication and authorization helpers
- Contains: `requireAuth()`, `requireTeam()`, `requireRole()`, JWT claim decoding, role validators
- Used by: All protected pages and API routes

**src/lib/supabase/**
- Purpose: Supabase client configuration
- Contains: Server-side client (SSR, cookie-based), client-side browser client
- Key files: `server.ts` (middleware + server components), `client.ts` (browser)

**src/lib/validations/**
- Purpose: Type-safe schema validation
- Contains: Zod schemas for auth, teams, equipment, athletes, invitations, damage reports
- Used by: API handlers (safeParse), client forms (zodResolver)

**src/lib/utils/**
- Purpose: Utility functions
- Contains: `slug.ts` (team slug generation), `team-code.ts` (8-char join code)

**supabase/**
- Purpose: Supabase-specific config and migrations
- Contains: Migration files for auth and storage setup

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout - initializes theme provider, sets metadata
- `src/app/page.tsx`: Home redirect - routes authenticated users to dashboard or team creation
- `src/middleware.ts`: Request middleware - enforces authentication and public/protected route rules
- `src/app/(dashboard)/layout.tsx`: Dashboard layout - wraps all team routes, requires auth

**Configuration:**
- `tsconfig.json`: TypeScript configuration, path aliases (`@/*` → `src/*`)
- `prisma/schema.prisma`: Database schema with all models and enums
- `.env.example`: Template for required environment variables
- `package.json`: Dependencies and build/dev/lint scripts

**Core Logic:**
- `src/lib/auth/authorize.ts`: Auth helpers used by all protected routes
- `src/lib/prisma.ts`: Prisma client singleton with dev-only hot reload
- `src/middleware.ts`: Public/protected route enforcement
- `src/lib/supabase/server.ts`: Supabase server client for middleware and RSCs
- `src/lib/supabase/client.ts`: Supabase browser client for client components

**Testing:**
- Not detected - no test files found in codebase

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (Next.js convention)
- Layout wrappers: `layout.tsx` (Next.js convention)
- Client components: `*-client.tsx` suffix (e.g., `roster-client.tsx`, `equipment-list-client.tsx`)
- API routes: `route.ts` in directories matching endpoint path (e.g., `src/app/api/equipment/route.ts` → `POST /api/equipment`)
- Validation schemas: `[domain].ts` in `src/lib/validations/` (e.g., `team.ts`, `equipment.ts`)
- Utility modules: named for function (e.g., `slug.ts`, `team-code.ts`)

**Directories:**
- Feature domains: singular or plural by convention (e.g., `athletes/`, `equipment/`, `equipment/`)
- Dynamic segments: `[param]` (e.g., `[teamSlug]`, `[code]`)
- Layout groups: `(group)` (e.g., `(auth)`, `(dashboard)`) - not in URL

**Exports:**
- Default export: Page components, forms, main component per file
- Named exports: Types, utilities, helper functions
- Re-exports: Validation schemas include `type XxxInput = z.infer<typeof xxxSchema>`

## Where to Add New Code

**New Feature:**
- Page route: Create `src/app/(dashboard)/[teamSlug]/[feature]/page.tsx`
  - Call `requireTeam()` or `requireRole()` at top
  - Fetch team-scoped data with Prisma using claims.team_id
  - Pass serialized data to client component
- API endpoint: Create `src/app/api/[resource]/route.ts` with GET/POST/PATCH/DELETE handlers
  - Validate user auth, extract team_id from claims
  - Use Prisma to query/mutate data scoped to team
  - Return JSON response (200/201/400/403/500)
- Validation schema: Add `src/lib/validations/[feature].ts` with Zod schema
- Component: Add to `src/components/[domain]/[feature].tsx`

**New Component/Module:**
- UI component: `src/components/[domain]/[component-name].tsx`
  - Use `'use client'` if interactive (forms, state, event handlers)
  - Export as default
- Utility module: `src/lib/utils/[function-name].ts`
  - Named exports for functions
  - Use in other modules via `import { funcName } from '@/lib/utils/function-name'`

**Utilities & Helpers:**
- Shared helpers: `src/lib/utils/`
- Auth logic: `src/lib/auth/authorize.ts` (add helpers here)
- Validation: `src/lib/validations/` (one schema file per domain)
- Type utilities: Export from schema files or dedicated `types.ts` if substantial

## Special Directories

**src/generated/prisma/**
- Purpose: Auto-generated Prisma types
- Generated: Yes - by `prisma generate` command
- Committed: Yes - checked into git for type safety in CI
- Pattern: Do not edit manually; regenerate after schema changes

**src/app/api/**
- Purpose: Server-side API endpoints
- Pattern: Each directory is a resource, `route.ts` is the handler
- Authorization: All handlers must explicitly check `requireTeam()` or `requireRole()`
- Scope: Always filter Prisma queries by teamId from JWT claims or DB fallback

**src/components/providers/**
- Purpose: React context providers
- Contains: `ThemeProvider` (dark/light mode), `TeamColorProvider` (team brand colors)
- Pattern: Wrap in layouts to provide context to subtree

---

*Structure analysis: 2026-01-20*
