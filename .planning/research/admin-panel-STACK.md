# Technology Stack - Admin Panel with User Creation

**Project:** Radl Admin Panel
**Researched:** 2026-01-30
**Confidence:** HIGH (verified with official Supabase documentation)

## Executive Summary

The admin panel requires **minimal new dependencies**. The existing stack (Supabase Auth, CASL, Prisma 6, Next.js 16) fully supports the requirements. The key additions are:

1. **Super Admin Role Storage** - Database table + custom JWT claims
2. **Supabase Admin API Usage** - Already have `admin.ts` with service role client
3. **Password Flow for Created Users** - `inviteUserByEmail()` or `createUser()` + `generateLink()`

---

## Stack Decisions

### 1. Super Admin Role Storage

**Decision:** Database table (`SuperAdmin`) + JWT custom claims via access token hook

**Rationale:**
- Super admin is **platform-level**, not tied to any tenant (Facility/Club)
- Must be separate from the 5-role tenant hierarchy (FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT)
- JWT claims enable RLS policies and fast permission checks without DB round-trips
- Database table provides audit trail and persistence

**Implementation:**

```prisma
// Add to schema.prisma
model SuperAdmin {
  id        String   @id @default(uuid())
  userId    String   @unique  // Supabase auth user ID
  createdAt DateTime @default(now())
  createdBy String?  // Who granted super admin (audit)

  @@index([userId])
}
```

**JWT Claims Update:**
```sql
-- Update custom_access_token_hook to include is_super_admin
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  is_super boolean;
  -- ... existing vars ...
BEGIN
  -- Check super admin status
  SELECT EXISTS(
    SELECT 1 FROM public."SuperAdmin"
    WHERE "userId" = (event->>'user_id')
  ) INTO is_super;

  claims := event->'claims';
  claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(is_super));

  -- ... rest of existing hook logic ...

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

**Why NOT app_metadata:**
- `app_metadata` is stored in Supabase's `auth.users` table (not our database)
- Harder to query, audit, and manage programmatically
- Our database table gives us full control and Prisma integration

**Confidence:** HIGH

---

### 2. User Creation Flow

**Decision:** Use `auth.admin.createUser()` for direct creation + `generateLink('recovery')` for password setup

**Rationale:**
- `createUser()` is synchronous and returns user immediately
- `inviteUserByEmail()` requires SMTP and is async (user clicks email link)
- For admin-created users, we want immediate creation with password setup link
- `generateLink('recovery')` creates a password reset link we can deliver however we want

**API Pattern:**

```typescript
// src/lib/supabase/admin.ts - add to existing file

export async function createUserWithPasswordSetup(email: string, metadata?: Record<string, unknown>) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Admin client not available');
  }

  // Create user with confirmed email (no verification needed - admin vouches)
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,  // Admin-created = trusted email
    user_metadata: metadata,
  });

  if (createError) {
    throw createError;
  }

  // Generate password recovery link for user to set their password
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`,
    },
  });

  if (linkError) {
    throw linkError;
  }

  return {
    user: userData.user,
    passwordSetupUrl: linkData.properties.action_link,
    // Can send this link via email, display in admin UI, etc.
  };
}
```

**Alternative: Invite Flow**

```typescript
// If you prefer email-based invite (requires SMTP)
export async function inviteUser(email: string) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Admin client not available');

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/accept-invite`,
  });

  return { data, error };
}
```

**Comparison:**

| Approach | When to Use |
|----------|-------------|
| `createUser()` + `generateLink('recovery')` | Admin creates user, provides link manually (or custom email) |
| `inviteUserByEmail()` | Automated email invite flow, user receives Supabase email |
| `createUser()` with password | Admin sets initial password, user must change on login |

**Recommendation:** Use `createUser()` + `generateLink('recovery')` because:
- Full control over email content/delivery
- Works even if SMTP not configured (can display link in admin UI)
- User sets their own password (better security)

**Confidence:** HIGH

**Sources:**
- [Supabase createUser API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase generateLink API](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)

---

### 3. CASL Integration for Super Admin

**Decision:** Extend existing CASL ability to check `is_super_admin` claim

**Implementation:**

```typescript
// src/lib/permissions/ability.ts - extend defineAbilityFor

export interface UserContext {
  userId: string;
  clubId: string;
  roles: ('FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[];
  linkedAthleteIds?: string[];
  facilityId?: string;
  viewMode: 'facility' | 'club' | null;
  isSuperAdmin?: boolean;  // NEW: Platform-level admin
}

export function defineAbilityFor(user: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  // SUPER ADMIN - platform owner, full access
  if (user.isSuperAdmin) {
    can('manage', 'all');  // CASL shorthand for all permissions
    return build();
  }

  // ... existing role logic unchanged ...
}
```

**Confidence:** HIGH

---

### 4. Admin Panel Route Protection

**Decision:** Middleware-based protection with server component verification

**Implementation:**

```typescript
// src/middleware.ts - add super admin route protection

import { jwtDecode } from 'jwt-decode';
import type { CustomJwtPayload } from '@/lib/auth/claims';

export async function middleware(request: NextRequest) {
  // ... existing logic ...

  // Super admin routes require is_super_admin claim
  if (request.nextUrl.pathname.startsWith('/super-admin')) {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const claims = jwtDecode<CustomJwtPayload & { is_super_admin?: boolean }>(
      session.data.session.access_token
    );
    if (!claims.is_super_admin) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // ... rest of middleware ...
}

export const config = {
  matcher: [
    // ... existing matchers ...
    '/super-admin/:path*',
  ],
};
```

**Confidence:** HIGH

---

### 5. No New Dependencies Required

The existing stack handles everything:

| Capability | Existing Tech | Already In Use |
|------------|---------------|----------------|
| User creation | Supabase Admin API | Yes (`admin.ts`) |
| JWT claims | Custom access token hook | Yes (`00006_facility_access_token_hook.sql`) |
| RBAC | CASL | Yes (`ability.ts`) |
| Database | Prisma 6 | Yes |
| Route protection | Next.js middleware | Yes (`middleware.ts`) |
| Form handling | React Hook Form + Zod | Yes |
| UI components | Existing component library | Yes |

---

## Recommended Stack (No Changes)

### Core Framework
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Next.js | 16.x | App framework | Existing |
| React | 19.x | UI library | Existing |
| TypeScript | 5.x | Type safety | Existing |

### Authentication & Authorization
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Supabase Auth | 2.x | Authentication | Existing |
| @supabase/ssr | 0.x | SSR auth helpers | Existing |
| CASL | 6.x | RBAC permissions | Existing |
| jwt-decode | 4.x | JWT parsing | Existing |

### Database
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Prisma | 6.x | ORM | Existing |
| PostgreSQL | 15+ | Database | Existing (Supabase) |

---

## API Reference: Supabase Admin Methods

For super admin panel, these are the key methods (all via service role client):

### User Management

```typescript
// List all users (paginated)
const { data, error } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 50,
});

// Get single user by ID
const { data, error } = await admin.auth.admin.getUserById(userId);

// Create user (no password - user sets via recovery link)
const { data, error } = await admin.auth.admin.createUser({
  email: 'user@example.com',
  email_confirm: true,
  user_metadata: { name: 'John Doe' },
});

// Create user with password (admin sets initial password)
const { data, error } = await admin.auth.admin.createUser({
  email: 'user@example.com',
  password: 'initial-password',
  email_confirm: true,
  user_metadata: { name: 'John Doe' },
});

// Update user
const { data, error } = await admin.auth.admin.updateUserById(userId, {
  email: 'new@example.com',
  user_metadata: { name: 'Jane Doe' },
});

// Delete user
const { data, error } = await admin.auth.admin.deleteUser(userId);

// Generate password recovery link
const { data, error } = await admin.auth.admin.generateLink({
  type: 'recovery',
  email: 'user@example.com',
  options: {
    redirectTo: 'https://app.radl.com/auth/set-password',
  },
});

// Sign out user (invalidate all sessions)
const { error } = await admin.auth.admin.signOut(userId);
```

### generateLink Type Options

| Type | Purpose | Creates User? |
|------|---------|---------------|
| `signup` | Account creation link | Yes |
| `magiclink` | Passwordless login | Yes |
| `invite` | Invitation link | Yes |
| `recovery` | Password reset | No |
| `email_change_current` | Verify old email | No |
| `email_change_new` | Verify new email | No |

### MFA Management (if needed)

```typescript
// List user's MFA factors
const { data, error } = await admin.auth.admin.mfa.listFactors({
  userId,
});

// Delete MFA factor (reset user's MFA)
const { error } = await admin.auth.admin.mfa.deleteFactor({
  userId,
  factorId,
});
```

**Confidence:** HIGH

**Sources:**
- [Supabase Admin API Overview](https://supabase.com/docs/reference/javascript/admin-api)
- [Supabase generateLink API](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)

---

## Security Considerations

### Service Role Key Protection

| Risk | Mitigation |
|------|------------|
| Key exposure in browser | Never import `admin.ts` in client components |
| Key in source control | Use environment variables, .env.local in .gitignore |
| Key in logs | Existing log masking in place |
| Unauthorized admin access | JWT claim `is_super_admin` checked at middleware + API level |

**Current project status:** Service role key already properly protected in `src/lib/supabase/admin.ts`. No changes needed.

### Super Admin Bootstrapping

Initial super admin must be created manually (before admin panel exists):

**Option A: SQL (recommended for initial setup)**
```sql
-- Run once in Supabase SQL Editor after first deployment
INSERT INTO "SuperAdmin" ("id", "userId", "createdAt")
VALUES (
  gen_random_uuid(),
  'YOUR_SUPABASE_USER_ID',  -- Get from Supabase Dashboard > Authentication > Users
  now()
);
```

**Option B: Prisma seed**
```typescript
// prisma/seed.ts
await prisma.superAdmin.upsert({
  where: { userId: process.env.INITIAL_SUPER_ADMIN_ID! },
  update: {},
  create: {
    userId: process.env.INITIAL_SUPER_ADMIN_ID!,
    createdBy: 'system-bootstrap',
  },
});
```

**Security note:** After initial bootstrap, additional super admins should only be created through the admin panel with audit logging.

**Confidence:** HIGH

---

## Password Flow Options

### Option A: Admin Creates, User Sets Password (Recommended)

```
1. Admin creates user via createUser() with email_confirm: true
2. Admin generates recovery link via generateLink('recovery')
3. Admin delivers link (custom email, SMS, or displays in admin UI)
4. User clicks link, sets their own password
5. User can now log in
```

**Pros:**
- User chooses their own password
- Works without SMTP (link can be displayed in admin UI)
- Full control over email content/delivery
- No shared password knowledge

**Cons:**
- Requires link delivery mechanism
- Link expires (typically 24h)

### Option B: Admin Sets Initial Password

```
1. Admin creates user via createUser() with email + password
2. Admin communicates password to user (email, phone, etc.)
3. User logs in with admin-provided password
4. (Optional) Force password change on first login via user_metadata flag
```

**Pros:**
- Simpler flow
- User can log in immediately

**Cons:**
- Admin knows the password temporarily
- Must implement "force password change" separately
- Password transmitted out-of-band

### Option C: Email Invite (Supabase Handles Email)

```
1. Admin calls inviteUserByEmail()
2. Supabase sends invite email automatically
3. User clicks invite link in email
4. User creates their own password
5. User can now log in
```

**Pros:**
- Fully automated
- Standard email invite flow
- PKCE security (when same browser)

**Cons:**
- Requires SMTP configured in Supabase
- Less control over email content/timing
- Rate limited (2/hour on free tier)

**Recommendation:** Option A gives most control and works without SMTP configuration.

**Confidence:** HIGH

---

## CustomJwtPayload Extension

Update the existing JWT payload type to include super admin claim:

```typescript
// src/lib/auth/claims.ts - update interface

export interface CustomJwtPayload {
  sub: string;
  email: string;
  // Facility hierarchy
  facility_id: string | null;
  club_id?: string | null;
  // Legacy
  team_id: string | null;
  user_role: 'COACH' | 'ATHLETE' | 'PARENT' | null;
  user_roles?: string[];
  // NEW: Platform admin
  is_super_admin?: boolean;  // Added by updated access token hook
}
```

**Confidence:** HIGH

---

## Existing Admin Client Review

The project already has a well-structured admin client:

```typescript
// src/lib/supabase/admin.ts (existing)
export function getSupabaseAdmin(): SupabaseClient | null {
  // Returns null if SUPABASE_SERVICE_ROLE_KEY not set
  // Already handles singleton pattern
  // Already has security warnings in comments
}

export async function getUserEmailsByIds(userIds: string[]): Promise<...> {
  // Already uses admin.auth.admin.listUsers()
  // Pattern can be extended for other admin operations
}
```

**Assessment:** Existing admin client is production-ready. Extend it with new methods rather than creating separate files.

**Confidence:** HIGH

---

## Summary for Roadmap

**No new dependencies needed.** The admin panel can be built with:

1. **Schema addition:** `SuperAdmin` table (simple model)
2. **Hook update:** Add `is_super_admin` claim to existing access token hook
3. **CASL update:** Check `isSuperAdmin` in ability builder
4. **Claims update:** Extend `CustomJwtPayload` interface
5. **New routes:** `/super-admin/*` with middleware protection
6. **New API routes:** User CRUD using existing admin client

**Estimated complexity:** LOW - This is configuration and routing, not new technology integration.

**Phase breakdown suggestion:**
1. Database schema + migration (SuperAdmin table)
2. Access token hook update + JWT claims
3. CASL ability update
4. Middleware route protection
5. Admin panel UI + API routes

---

## Sources

### Official Supabase Documentation (HIGH confidence)
- [Supabase createUser API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase generateLink API](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Supabase Admin API Overview](https://supabase.com/docs/reference/javascript/admin-api)
- [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Custom Claims RBAC Guide](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Service Role Key Security](https://supabase.com/docs/guides/api/api-keys)

### WebSearch Results (verified with official docs)
- [Supabase Discussions - Programmatic User Creation](https://github.com/orgs/supabase/discussions/5043)
- [Password Reset Flow Discussion](https://github.com/orgs/supabase/discussions/3360)
- [Set Password After Invite Discussion](https://github.com/orgs/supabase/discussions/20333)
