# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**Authentication & Backend (Supabase):**
- Supabase (supabase.co) - Backend-as-a-Service platform
  - SDK/Client: `@supabase/supabase-js` (2.90.1), `@supabase/ssr` (0.8.0)
  - Server client: `src/lib/supabase/server.ts`
  - Browser client: `src/lib/supabase/client.ts`
  - Used by middleware in `src/middleware.ts`
  - Auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Provider: Supabase (AWS hosted)
  - Connection: Pooler-based (port 5432, IPv6)
  - Client: Prisma ORM
  - Connection URL: `DATABASE_URL` (for application queries via pooler)
  - Direct URL: `DIRECT_URL` (for migrations, bypasses pooler)
  - Schema location: `prisma/schema.prisma`
  - Migrations: `prisma/migrations/`
  - Generated client: `src/generated/prisma/`
  - Models: Team, TeamMember, Invitation, Equipment, DamageReport, AthleteProfile, Notification, TeamSettings

**File Storage (Supabase Storage):**
- Supabase Storage buckets:
  - `team-assets` - Team logos and branding files
    - Upload in `src/components/forms/create-team-form.tsx`
    - Public URLs for team logos
    - Cache control: 3600 seconds
  - `damage-photos` - Damage report photos
    - Upload in `src/components/equipment/damage-report-form.tsx`
    - Public URLs for equipment damage documentation
    - Cache control: 3600 seconds
    - Max file size enforced: 10MB
    - Accepted types: JPEG, PNG, WebP
- Access: Browser client calls `.storage.from(bucket).upload()` and `.getPublicUrl()`

**Caching:**
- None detected - No Redis or cache layer configured

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: OAuth-based with session cookies
  - Server-side session management via `@supabase/ssr`
  - Cookie-based auth in middleware (`src/middleware.ts`)
  - Public routes defined in middleware:
    - `/login`, `/signup`, `/auth/callback`
    - `/join/[code]` - For team invite acceptance
    - `/report/` - For QR-based damage reporting
    - `/api/equipment/` - For anonymous damage report submission
  - Auth callback route: `src/app/api/auth/callback/route.ts`
    - Exchanges authorization code for session via `supabase.auth.exchangeCodeForSession(code)`
  - User verification: Uses `supabase.auth.getUser()` (not `getSession()`)
    - Called in middleware for JWT verification
    - Returns authenticated user or null
  - JWT handling: `jwt-decode` package for token inspection

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, DataDog, or error tracking service configured

**Logs:**
- Console logging only (`console.error()` calls in API routes)
- Error logging in:
  - `src/app/api/equipment/[id]/damage-reports/route.ts` - Photo upload errors
  - `src/components/forms/create-team-form.tsx` - Logo upload errors
  - `src/components/equipment/damage-report-form.tsx` - Photo upload errors

## CI/CD & Deployment

**Hosting:**
- Recommendation: Vercel (mentioned in README)
- Alternative: Any Node.js runtime supporting Next.js 16

**CI Pipeline:**
- None detected - No GitHub Actions, GitLab CI, or other CI service configured

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key (public)
- `DATABASE_URL` - PostgreSQL connection string for app queries via pooler
- `DIRECT_URL` - PostgreSQL direct connection for migrations
- `NODE_ENV` - Application environment (development/production)

**Secrets location:**
- `.env` - Local development (committed, contains public Supabase keys only)
- `.env.local` - Local secrets and overrides (not committed)
- `.env.local.example` - Template for required env vars
- Production: Environment variables set on deployment platform (Vercel or equivalent)

**Supabase Configuration Details:**
- Project URL: `https://bluixsnxkkwhzcugpvhv.supabase.co`
- Database: PostgreSQL on AWS (us-east-1)
- Pooler endpoint: `aws-1-us-east-1.pooler.supabase.com`
- Storage buckets: `team-assets`, `damage-photos`

## Webhooks & Callbacks

**Incoming:**
- Supabase auth callback: `GET /api/auth/callback`
  - Receives `code` and `next` query parameters
  - Exchanges code for session via Supabase SDK
  - Redirects to authenticated route or login on failure

**Outgoing:**
- None detected - No outbound webhooks to external services

## Data Flow

**Authentication Flow:**
1. User signs up/logs in via Supabase Auth UI
2. Supabase redirects to `/api/auth/callback?code=XXX&next=...`
3. Callback route exchanges code for session using `@supabase/ssr`
4. Session stored in cookies
5. Middleware verifies user on each request via `supabase.auth.getUser()`

**File Upload Flow:**
1. Client-side form accepts file (logo or damage photo)
2. Validation: file type, size (2MB for logos, 10MB for photos)
3. Upload to Supabase Storage bucket via `supabase.storage.from(bucket).upload(filePath, file)`
4. Get public URL via `supabase.storage.from(bucket).getPublicUrl(filePath)`
5. Store URL in database (Prisma) or pass to API for storage

**Team Creation Flow:**
1. Create team via `POST /api/teams`
2. Generate unique slug and 8-char join code
3. Add creator as COACH member
4. Optionally upload logo to `team-assets` bucket
5. Update team record with logo URL

**Damage Report Flow:**
1. Anonymous or authenticated user accesses damage report page
2. Optionally uploads damage photo to `damage-photos` bucket
3. Submits damage report via `POST /api/equipment/[id]/damage-reports`
4. API creates Prisma record and notifications
5. Notifications sent to configured coaches

## Integration Points

**Prisma Transactions:**
- Used in `src/app/api/teams/route.ts` for team creation
- Ensures team and member creation are atomic

**CSV Import:**
- Papa Parse library used to parse CSV for bulk athlete imports
- No external service - local file processing only

**QR Codes:**
- qrcode.react generates QR codes for damage report links
- Links format: `/report/{equipmentId}`
- No external QR service - client-side generation

---

*Integration audit: 2026-01-20*
