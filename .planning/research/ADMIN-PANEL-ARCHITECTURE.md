# Architecture Patterns: Super Admin Panel Integration

**Domain:** Super Admin Panel for Multi-tenant Next.js + Supabase Application
**Researched:** 2026-01-30
**Confidence:** HIGH (based on existing codebase analysis + official documentation patterns)

## Executive Summary

The Radl application already has a well-structured multi-tenant architecture with route groups, CASL-based permissions, JWT claims, and RLS policies. Adding a super admin panel requires:

1. A new `(admin)` route group isolated from `(dashboard)`
2. A new `SUPER_ADMIN` role that bypasses tenant scoping
3. Service role database access for cross-tenant queries
4. Extended CASL abilities with `can('manage', 'all')` pattern

The existing infrastructure (CASL, service role client, RLS helpers) already provides most building blocks. The primary work is creating the isolated route group and extending the permission system.

---

## Recommended Architecture

### Route Structure

```
src/app/
├── (auth)/              # Existing: login, signup
├── (dashboard)/         # Existing: tenant-scoped dashboard
│   ├── [teamSlug]/      # Team/club pages
│   └── layout.tsx       # AbilityProvider with tenant context
├── (admin)/             # NEW: Super admin panel
│   ├── layout.tsx       # Admin-specific layout with super admin check
│   ├── page.tsx         # Admin dashboard home
│   ├── users/           # User management across all tenants
│   ├── facilities/      # Facility management
│   ├── clubs/           # Club/team management
│   ├── analytics/       # Platform-wide analytics
│   ├── audit-logs/      # Cross-tenant audit log viewer
│   └── settings/        # System settings
└── api/
    └── admin/           # NEW: Admin-only API routes
        ├── users/
        ├── facilities/
        ├── clubs/
        └── analytics/
```

**Key Decision: Separate Route Group**

Use `(admin)` as a separate route group rather than nesting under `(dashboard)` because:

1. **Layout Isolation:** Admin panel needs different layout (no tenant context switcher, different nav)
2. **Auth Path Separation:** Admin auth can redirect differently on failure
3. **Team Independence:** Admins should not be forced through club selection flows
4. **URL Cleanliness:** `/admin/*` routes are cleaner than `/[teamSlug]/admin/*`

### Component Boundaries

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| `(admin)/layout.tsx` | Super admin auth check, admin nav, no tenant context | **NEW** |
| `src/lib/auth/admin-authorize.ts` | Super admin auth helpers | **NEW** |
| `src/lib/permissions/ability.ts` | Add SUPER_ADMIN role abilities | **MODIFIED** |
| `src/lib/permissions/subjects.ts` | Add admin-specific subjects | **MODIFIED** |
| `src/lib/supabase/admin.ts` | Already exists - use for RLS bypass | **EXISTING** |
| `src/middleware.ts` | Add `/admin` to protected routes | **MODIFIED** |
| `prisma/schema.prisma` | Add SUPER_ADMIN to Role enum | **MODIFIED** |

---

## Super Admin Authentication Pattern

### Database Model Changes

```prisma
// Add to Role enum in schema.prisma
enum Role {
  SUPER_ADMIN    // NEW: Platform-level admin
  FACILITY_ADMIN
  CLUB_ADMIN
  COACH
  ATHLETE
  PARENT
}

// NEW: SuperAdmin table (not tied to any facility/club)
model SuperAdmin {
  id        String   @id @default(uuid())
  userId    String   @unique  // Supabase auth user ID
  createdAt DateTime @default(now())
  createdBy String   // Who granted super admin access

  @@index([userId])
}
```

**Why separate table instead of adding to existing membership tables:**
- Super admins are platform-level, not tenant-level
- Keeps tenant membership tables clean
- Easier to audit who has super admin access
- Can exist independently without any facility/club membership

### Auth Helper: `admin-authorize.ts`

```typescript
// src/lib/auth/admin-authorize.ts

import { redirect } from 'next/navigation';
import { getAuthUser } from './authorize';
import { prisma } from '@/lib/prisma';

/**
 * Check if user is a super admin.
 * Does NOT use JWT claims - queries database directly for security.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { userId },
  });
  return !!superAdmin;
}

/**
 * Require super admin access for a route.
 * Redirects to dashboard if not authorized.
 */
export async function requireSuperAdmin() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = await isSuperAdmin(user.id);

  if (!isAdmin) {
    // Redirect to dashboard, not 403 - don't reveal admin exists
    redirect('/');
  }

  return user;
}

/**
 * Get super admin context for API routes.
 * Returns null if not super admin.
 */
export async function getSuperAdminContext() {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const isAdmin = await isSuperAdmin(user.id);

  if (!isAdmin) {
    return null;
  }

  return { userId: user.id, isSuperAdmin: true };
}
```

**Security Decision: Database query, not JWT claims**

Super admin status should NOT be in JWT claims because:
1. JWT claims are cached/refreshed infrequently
2. Revoking super admin should be immediate
3. Super admin is a sensitive privilege - verify on each request
4. Avoids JWT token hijacking granting admin access

---

## CASL Ability Pattern for Super Admin

### Extended `ability.ts`

```typescript
// Add to src/lib/permissions/ability.ts

export interface UserContext {
  userId: string;
  clubId: string;
  roles: ('SUPER_ADMIN' | 'FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[];
  linkedAthleteIds?: string[];
  facilityId?: string;
  viewMode: 'facility' | 'club' | null;
  isSuperAdmin?: boolean;  // NEW: Bypasses all tenant scoping
}

export function defineAbilityFor(user: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  // SUPER_ADMIN - full platform access
  if (user.isSuperAdmin || user.roles.includes('SUPER_ADMIN')) {
    // The "manage all" pattern - can do anything on any subject
    can('manage', 'all');

    // Explicit admin-only actions
    can('impersonate', 'User');
    can('view-all-tenants', 'Facility');
    can('view-all-tenants', 'Team');
    can('access-admin-panel', 'AdminPanel');

    return build();  // Early return - super admin has everything
  }

  // ... existing role definitions unchanged ...
}
```

### Extended `actions.ts`

```typescript
// Add to src/lib/permissions/actions.ts

export const ACTIONS = {
  // ... existing actions ...

  // Admin-only actions (NEW)
  impersonate: 'impersonate',
  viewAllTenants: 'view-all-tenants',
  accessAdminPanel: 'access-admin-panel',
  managePlatform: 'manage-platform',
} as const;
```

### Extended `subjects.ts`

```typescript
// Add to src/lib/permissions/subjects.ts

export type AppSubjects =
  | Subjects<{
      // ... existing subjects ...
      AdminPanel: { id: string };  // NEW: Virtual subject for admin access check
      User: { id: string };        // NEW: For user management
    }>
  | 'AuditLog'
  | 'ApiKey'
  | 'AdminPanel'  // NEW
  | 'User';       // NEW
```

---

## Database Access Pattern: Bypassing RLS

### Current State Analysis

The codebase already has a service role client in `src/lib/supabase/admin.ts`:

```typescript
// Already exists - use this for admin queries
export function getSupabaseAdmin(): SupabaseClient | null {
  // Creates client with SUPABASE_SERVICE_ROLE_KEY
  // Bypasses all RLS policies
}
```

### Recommended Pattern for Admin Queries

**Option A: Prisma for Admin Queries (RECOMMENDED)**

Prisma already bypasses RLS when using the service role connection string. For admin routes:

```typescript
// src/lib/prisma-admin.ts
import { PrismaClient } from '@/generated/prisma';

// Separate Prisma client for admin operations
// Uses same connection but explicitly for cross-tenant queries
let prismaAdmin: PrismaClient | undefined;

export function getPrismaAdmin(): PrismaClient {
  if (!prismaAdmin) {
    prismaAdmin = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  return prismaAdmin;
}
```

**Why Prisma over Supabase client for admin:**
- Prisma already has full database access (no RLS in Prisma path)
- Type safety with generated types
- Consistent with rest of codebase
- Supabase client RLS bypass requires service role - same security level

**Option B: Supabase Service Role (for Auth operations)**

Use `getSupabaseAdmin()` only for:
- User management (listing users, looking up emails)
- Auth operations (password resets, MFA management)
- Storage operations across tenants

```typescript
// Example: List all users (auth.admin API)
const admin = getSupabaseAdmin();
if (admin) {
  const { data } = await admin.auth.admin.listUsers();
}
```

### RLS Bypass Strategy Summary

| Operation Type | Client to Use | RLS Behavior |
|---------------|---------------|--------------|
| Tenant-scoped read/write | `prisma` (regular) | Respects tenant scope |
| Cross-tenant read | `getPrismaAdmin()` | No RLS (Prisma path) |
| Cross-tenant write | `getPrismaAdmin()` | No RLS (Prisma path) |
| User auth operations | `getSupabaseAdmin()` | Bypasses RLS |
| Storage cross-tenant | `getSupabaseAdmin()` | Bypasses RLS |

---

## Admin Layout Integration

### `(admin)/layout.tsx`

```typescript
// src/app/(admin)/layout.tsx

import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/admin-authorize';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify super admin on every request
  const user = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader user={user} />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Key Differences from Dashboard Layout:**
- No `AbilityProvider` with tenant context needed (super admin has full access)
- No context switcher (admin sees all)
- Different navigation structure
- No team colors/branding
- Simpler layout (no PWA wrapper needed)

### Middleware Update

```typescript
// src/middleware.ts - add /admin to protected routes

const publicRoutes = [
  '/login',
  '/signup',
  // ... existing ...
];

// Admin routes are protected but don't need special handling
// The (admin)/layout.tsx handles super admin verification
```

---

## API Route Pattern for Admin Endpoints

### Structure

```
src/app/api/admin/
├── users/
│   ├── route.ts          # GET: list all users, POST: create user
│   └── [id]/
│       └── route.ts      # GET/PATCH/DELETE specific user
├── facilities/
│   ├── route.ts          # GET: list all facilities
│   └── [id]/
│       └── route.ts      # GET/PATCH facility details
├── clubs/
│   ├── route.ts          # GET: list all clubs across facilities
│   └── [id]/
│       └── route.ts      # GET/PATCH club details
├── analytics/
│   └── route.ts          # GET: platform-wide analytics
└── audit-logs/
    └── route.ts          # GET: cross-tenant audit logs
```

### Example Admin API Route

```typescript
// src/app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getPrismaAdmin } from '@/lib/prisma-admin';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  // Verify super admin
  const adminContext = await getSuperAdminContext();

  if (!adminContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use Supabase admin for user listing (auth.admin API)
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 });
  }

  const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }

  // Enrich with membership data from Prisma
  const prismaAdmin = getPrismaAdmin();
  const enrichedUsers = await Promise.all(
    authUsers.users.map(async (user) => {
      const memberships = await prismaAdmin.clubMembership.findMany({
        where: { userId: user.id },
        include: { club: { select: { name: true, slug: true } } },
      });

      return {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        memberships: memberships.map(m => ({
          clubName: m.club.name,
          clubSlug: m.club.slug,
          roles: m.roles,
        })),
      };
    })
  );

  return NextResponse.json({ users: enrichedUsers });
}
```

---

## Build Order Considering Dependencies

### Phase 1: Database & Core Auth (No UI)

1. **Add SUPER_ADMIN to Role enum** in `prisma/schema.prisma`
2. **Create SuperAdmin table** in `prisma/schema.prisma`
3. **Run migration:** `npx prisma migrate dev`
4. **Create admin-authorize.ts** with `isSuperAdmin`, `requireSuperAdmin`
5. **Manually create first super admin record** via SQL or seed script

### Phase 2: CASL Extension

1. **Update ability.ts** - add SUPER_ADMIN handling with `can('manage', 'all')`
2. **Update actions.ts** - add admin-specific actions
3. **Update subjects.ts** - add admin subjects

### Phase 3: Route Group & Layout

1. **Create `(admin)` route group** with basic layout
2. **Update middleware.ts** - ensure `/admin/*` protected
3. **Create AdminSidebar, AdminHeader components**
4. **Create admin dashboard page** `(admin)/page.tsx`

### Phase 4: Admin API Routes

1. **Create `/api/admin/users` route** for user management
2. **Create `/api/admin/facilities` route** for facility listing
3. **Create `/api/admin/clubs` route** for cross-tenant club listing
4. **Create `/api/admin/audit-logs` route** for global audit access

### Phase 5: Admin UI Pages

1. **Users page** with search, filtering, role display
2. **Facilities page** with club count, member count
3. **Clubs page** with cross-facility view
4. **Analytics page** with platform metrics

---

## Anti-Patterns to Avoid

### 1. JWT-Based Super Admin Check

**Wrong:**
```typescript
// DO NOT DO THIS
if (claims.isSuperAdmin) {
  // grant access
}
```

**Why:** JWT claims are cached. Revoking admin access won't take effect until token expires.

**Right:** Query SuperAdmin table on each request.

### 2. Reusing Dashboard Layout

**Wrong:**
```typescript
// DO NOT DO THIS - nesting admin under dashboard
src/app/(dashboard)/admin/...
```

**Why:** Dashboard layout expects tenant context, forces admin through club selection.

**Right:** Separate `(admin)` route group with its own layout.

### 3. Tenant-Scoped Prisma for Admin

**Wrong:**
```typescript
// DO NOT DO THIS in admin routes
const { clubId } = await getClaimsForApiRoute();
await prisma.team.findMany({ where: { id: clubId } });
```

**Why:** Admin needs to see ALL tenants, not just their own.

**Right:** Use `getPrismaAdmin()` for cross-tenant queries.

### 4. Sharing AbilityProvider Context

**Wrong:**
```typescript
// DO NOT DO THIS
<AbilityProvider user={{ ...userContext, isSuperAdmin: true }}>
  {/* admin content */}
</AbilityProvider>
```

**Why:** AbilityProvider expects tenant context (clubId). Admin routes don't have one.

**Right:** Either create `AdminAbilityProvider` or skip CASL in admin (super admin has all permissions anyway).

---

## Integration Points Summary

| Existing Component | Integration Required |
|-------------------|---------------------|
| `src/lib/auth/authorize.ts` | Import existing `getAuthUser` in admin-authorize |
| `src/lib/supabase/admin.ts` | Use `getSupabaseAdmin()` for user management |
| `src/lib/prisma.ts` | Reference pattern for `prisma-admin.ts` |
| `src/lib/permissions/ability.ts` | Add SUPER_ADMIN handling |
| `src/middleware.ts` | No special changes needed (layout handles admin auth) |
| `prisma/schema.prisma` | Add Role.SUPER_ADMIN, SuperAdmin table |

---

## Security Considerations

1. **No admin routes exposed to tenants:** `/admin/*` only accessible to super admins
2. **Database-verified access:** Every admin request queries SuperAdmin table
3. **Audit all admin actions:** Log to AuditLog with special `SUPER_ADMIN` actor type
4. **No super admin in JWT:** Prevents token hijacking from granting admin access
5. **Separate admin client:** `getPrismaAdmin()` clearly marks cross-tenant operations
6. **Rate limiting:** Consider adding stricter rate limits on admin API routes

---

## Sources

- [Next.js Route Groups Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) - Official pattern for route group organization
- [CASL Super Admin Pattern](https://github.com/stalniy/casl/issues/119) - GitHub issue confirming `can('manage', 'all')` pattern
- [Supabase Service Role Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Official RLS bypass pattern
- Existing codebase analysis of `/home/hb/radl/src/lib/auth/`, `/home/hb/radl/src/lib/permissions/`, `/home/hb/radl/src/lib/supabase/admin.ts`
