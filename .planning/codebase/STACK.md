# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- TypeScript 5.x - All source code, API routes, configuration
- JSX/TSX - React components and pages in `src/app` and `src/components`

**Secondary:**
- JavaScript - ESLint configuration in `eslint.config.mjs`

## Runtime

**Environment:**
- Node.js v18.19.1 (current) - Specified in package.json via Next.js requirements

**Package Manager:**
- npm - Specified in package.json
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.3 - Full-stack React framework with App Router
  - App Router (default in v16)
  - Server Components
  - API Routes in `src/app/api`
  - Middleware in `src/middleware.ts`

**Frontend:**
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**Form Handling:**
- react-hook-form 7.71.1 - Form state management
- @hookform/resolvers 5.2.2 - Schema validation integration

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind

**Backend/Database:**
- Prisma 6.0.0 - ORM for PostgreSQL database access
- @prisma/client 6.0.0 - Runtime Prisma client

**Validation:**
- Zod 4.3.5 - Schema validation library (used in `src/lib/validations/*`)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.1 - Supabase client for authentication and storage
  - Browser client created in `src/lib/supabase/client.ts`
  - Used for file uploads to buckets: `team-assets`, `damage-photos`
- @supabase/ssr 0.8.0 - Supabase SSR adapter for server-side operations
  - Server client created in `src/lib/supabase/server.ts`
  - Used in middleware and API routes

**Utilities:**
- nanoid 5.1.6 - ID generation for damage report photos
- jwt-decode 4.0.0 - JWT token parsing (authentication handling)
- papaparse 5.5.3 - CSV parsing for bulk athlete imports
- qrcode.react 4.2.0 - QR code generation for damage report links
- dotenv 17.2.3 - Environment variable loading for development

**Type Definitions:**
- @types/node 20.x - Node.js type definitions
- @types/react 19.x - React type definitions
- @types/react-dom 19.x - React DOM type definitions
- @types/papaparse 5.5.2 - Papa Parse type definitions

## Configuration

**Environment:**
- Supabase public URL: `NEXT_PUBLIC_SUPABASE_URL`
- Supabase anonymous key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Database pooler connection: `DATABASE_URL` (PostgreSQL via Supabase pooler)
- Database direct URL: `DIRECT_URL` (for Prisma migrations)
- Node environment: `NODE_ENV`

**Build:**
- `tsconfig.json` - TypeScript configuration
  - Target: ES2017
  - Path alias: `@/*` maps to `./src/*`
  - Module resolution: bundler (for Next.js)
  - Strict mode enabled
  - JSX: react-jsx
- `next.config.ts` - Next.js configuration (minimal, using defaults)
- `eslint.config.mjs` - ESLint configuration using flat config format
  - Uses `eslint-config-next/core-web-vitals`
  - Uses `eslint-config-next/typescript`

**Prisma:**
- `prisma/schema.prisma` - Database schema definition
  - Provider: PostgreSQL
  - Database credentials from `DATABASE_URL`
  - Direct connection from `DIRECT_URL` for migrations
- `prisma.config.ts` - Prisma configuration (migrations path, datasource)
- Generated client: `src/generated/prisma/` (output location)

## Platform Requirements

**Development:**
- Node.js v18+
- npm (npm 9+ recommended)
- PostgreSQL database (via Supabase)
- Supabase project with configured auth and storage

**Production:**
- Deployment target: Vercel (suggested in README)
- Alternative: Any Node.js hosting that supports Next.js
- PostgreSQL database connectivity required
- Environment variables must be set: Supabase credentials, database URLs

---

*Stack analysis: 2026-01-20*
