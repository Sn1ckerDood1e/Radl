# Phase 36: Admin Foundation & Authentication - Research

**Researched:** 2026-01-30
**Domain:** Super admin authentication, MFA enforcement, admin panel routing, audit logging
**Confidence:** HIGH

## Summary

This phase establishes the foundation for a secure admin panel: a dedicated `SuperAdmin` database table, database-verified access on every request (not JWT-cached), MFA enforcement using Supabase's built-in TOTP, CASL integration with `can('manage', 'all')`, session timeout at 30 minutes inactivity, and comprehensive audit logging.

The existing codebase already has robust auth patterns (`authorize.ts`, `claims.ts`), CASL permissions (`ability.ts`), and audit logging infrastructure (`AuditLog` model, `logAuditEvent()`). The main work is extending these with super admin support and creating the isolated `(admin)` route group.

**Primary recommendation:** Create a `SuperAdmin` table, update the custom access token hook to include `is_super_admin` claim, extend CASL abilities with super admin handling, and build an `(admin)` route group with protected layout that verifies super admin status from database on every request.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Auth | 2.93.3 | Authentication + MFA | Already in use, built-in TOTP MFA |
| @casl/ability | 6.8.0 | Permission management | Already in use for RBAC |
| @casl/prisma | 1.6.1 | Prisma integration | Already in use |
| Prisma | 6.0.0 | Database ORM | Already in use |
| Next.js | 16.1.3 | App framework | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jwt-decode | 4.0.0 | JWT claim extraction | Super admin claim verification |
| @supabase/ssr | 0.8.0 | Server-side auth | Session management in layouts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SuperAdmin table | app_metadata field | Table gives Prisma integration, audit trail, easier queries |
| JWT claim for super admin | Database-only check | Claim enables fast middleware checks; database check is backup |
| Supabase MFA | External TOTP library | Supabase MFA is simpler, already integrated, free |

**Installation:**
```bash
# No new dependencies required - all already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (admin)/                    # NEW: Admin route group
│   │   ├── layout.tsx              # Admin layout with sidebar, super admin verification
│   │   ├── page.tsx                # Admin dashboard (platform stats)
│   │   ├── users/                  # Phase 37
│   │   ├── facilities/             # Phase 38
│   │   ├── clubs/                  # Phase 39
│   │   └── audit/                  # Audit log viewer
│   ├── (auth)/                     # Existing auth routes
│   │   ├── login/
│   │   └── mfa-setup/              # NEW: MFA enrollment for super admins
│   └── (dashboard)/                # Existing tenant dashboard
├── lib/
│   ├── auth/
│   │   ├── authorize.ts            # Existing - extend with super admin
│   │   ├── admin-authorize.ts      # NEW: Super admin verification helpers
│   │   └── claims.ts               # Existing - extend CustomJwtPayload
│   ├── permissions/
│   │   ├── ability.ts              # Existing - add super admin handling
│   │   └── subjects.ts             # Existing - may need 'all' subject
│   └── audit/
│       ├── actions.ts              # Existing - add admin actions
│       └── logger.ts               # Existing - works as-is
└── middleware.ts                   # Existing - add /admin/* protection
```

### Pattern 1: Database-Verified Super Admin Check

**What:** Query `SuperAdmin` table on every admin request, not just JWT claims
**When to use:** Every admin layout render, every admin API route
**Example:**
```typescript
// Source: Existing authorize.ts pattern extended
// src/lib/auth/admin-authorize.ts

import { prisma } from '@/lib/prisma';
import { requireAuth } from './authorize';
import { redirect } from 'next/navigation';

/**
 * Check if user is super admin (database verified).
 * SECURITY: Always query database, never trust JWT claims alone.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const superAdmin = await prisma.superAdmin.findUnique({
    where: { userId },
  });
  return !!superAdmin;
}

/**
 * Require super admin access.
 * Redirects to dashboard if not super admin.
 */
export async function requireSuperAdmin() {
  const user = await requireAuth();

  const isAdmin = await isSuperAdmin(user.id);
  if (!isAdmin) {
    redirect('/');  // Silent redirect per CONTEXT.md
  }

  return user;
}
```

### Pattern 2: MFA Enforcement for Super Admins

**What:** Block admin panel access until MFA is configured
**When to use:** Admin layout initial load
**Example:**
```typescript
// Source: Supabase MFA documentation
// src/app/(admin)/layout.tsx - MFA check pattern

import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();

  // Check MFA status
  const { data: { currentLevel, nextLevel } } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // If MFA not enrolled or not verified, redirect to MFA setup
  if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
    // MFA enrolled but not verified this session
    redirect('/mfa-verify');
  }

  // Check if user has any MFA factors enrolled
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (!factors?.totp || factors.totp.length === 0) {
    // No MFA configured - must set up before admin access
    redirect('/mfa-setup?required=true');
  }

  return (
    <AdminAbilityProvider>
      <AdminSidebar />
      {children}
    </AdminAbilityProvider>
  );
}
```

### Pattern 3: CASL Super Admin Abilities

**What:** Super admin gets `can('manage', 'all')` for full platform access
**When to use:** Admin context ability definition
**Example:**
```typescript
// Source: CASL documentation + existing ability.ts pattern
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
    can('manage', 'all');  // CASL special keywords for full access
    return build();  // No need to process other roles
  }

  // ... existing role logic unchanged ...
}
```

### Pattern 4: Admin Audit Logging

**What:** Log all admin actions with actor, target, before/after state
**When to use:** Every mutating admin operation
**Example:**
```typescript
// Source: Existing audit/logger.ts pattern extended
// Admin action logging with before/after state

export interface AdminAuditEntry extends AuditEntry {
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}

export async function logAdminAction(
  context: { userId: string; ipAddress?: string; userAgent?: string },
  entry: AdminAuditEntry
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      clubId: 'PLATFORM',  // Special marker for platform-level actions
      userId: context.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: {
        ...entry.metadata,
        beforeState: entry.beforeState ?? null,
        afterState: entry.afterState ?? null,
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    },
  });
}
```

### Anti-Patterns to Avoid
- **JWT-only super admin check:** Never trust JWT claims alone for super admin; always verify against database
- **Shared layout with dashboard:** Admin panel must have its own layout, not extend dashboard layout
- **MFA skip for convenience:** Never allow admin access without MFA enrollment
- **Silent failures:** Admin operations must be audited even on failure

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOTP generation | Custom TOTP library | Supabase MFA API | Supabase handles secret generation, QR codes, backup, rate limiting |
| Session timeout | Custom timer + localStorage | Supabase inactivity timeout setting | Supabase has built-in session timeout in Auth settings |
| Permission checking | Custom if/else chains | CASL `can()` and `cannot()` | Type-safe, tested, handles edge cases |
| Audit logging | Custom logging table | Existing `AuditLog` model | Already has RLS, indexes, and helper functions |
| Admin route protection | Per-page checks | Layout-level `requireSuperAdmin()` | Centralized, impossible to bypass |

**Key insight:** The existing codebase has most building blocks in place. This phase is about connecting them correctly for the admin use case, not building new capabilities.

## Common Pitfalls

### Pitfall 1: JWT Claim Caching
**What goes wrong:** Super admin status cached in JWT for 1 hour; revoked admin can still access
**Why it happens:** JWT claims set at login, not updated until token refresh
**How to avoid:** Always query `SuperAdmin` table in admin layout and API routes
**Warning signs:** Admin access works even after database DELETE

### Pitfall 2: MFA Bypass via Direct URL
**What goes wrong:** User bookmarks admin page, bypasses MFA setup redirect
**Why it happens:** MFA check only in one component, not layout
**How to avoid:** MFA check must be in admin layout.tsx (runs on every request)
**Warning signs:** Super admin without MFA can access admin pages

### Pitfall 3: Incomplete Audit Logging
**What goes wrong:** Some admin actions not logged, compliance gaps
**Why it happens:** Logging added ad-hoc, not systematically
**How to avoid:** Create audit middleware/wrapper for all admin mutations
**Warning signs:** AuditLog has gaps for certain action types

### Pitfall 4: Session Timeout Confusion
**What goes wrong:** Timeout configured but doesn't work as expected
**Why it happens:** Supabase timeout is inactivity-based, requires dashboard config
**How to avoid:** Configure in Supabase Dashboard > Auth > Sessions, not code
**Warning signs:** Sessions persist indefinitely despite configuration

### Pitfall 5: Admin Layout State Leakage
**What goes wrong:** Admin context (abilities, user) leaks to non-admin routes
**Why it happens:** AbilityProvider with `isSuperAdmin: true` persists across navigation
**How to avoid:** Admin route group has dedicated AbilityProvider with admin context
**Warning signs:** Regular dashboard shows admin-level permissions

## Code Examples

Verified patterns from official sources:

### Supabase MFA Enrollment
```typescript
// Source: https://supabase.com/docs/guides/auth/auth-mfa/totp

async function enrollMFA() {
  const supabase = await createClient();

  // Step 1: Start enrollment
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Radl Admin TOTP',
  });

  if (error) throw error;

  // data contains: id (factorId), type, totp.qr_code, totp.secret, totp.uri
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,    // Display as <img src={qrCode} />
    secret: data.totp.secret,      // Show for manual entry
  };
}

async function verifyMFAEnrollment(factorId: string, code: string) {
  const supabase = await createClient();

  // Step 2: Challenge
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  // Step 3: Verify
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) throw error;
  // Factor is now active for this user
  return data;
}
```

### SuperAdmin Table Schema
```prisma
// Source: Existing Prisma patterns in schema.prisma

model SuperAdmin {
  id        String   @id @default(uuid())
  userId    String   @unique  // Supabase auth.users ID
  createdAt DateTime @default(now())
  createdBy String?  // userId who granted (for audit)

  @@index([userId])
}
```

### Access Token Hook Update
```sql
-- Source: Existing 00006_facility_access_token_hook.sql pattern

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
  -- Check super admin status first
  SELECT EXISTS(
    SELECT 1 FROM public."SuperAdmin"
    WHERE "userId" = (event->>'user_id')
  ) INTO is_super;

  claims := event->'claims';

  -- Add is_super_admin claim
  claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(is_super));

  -- ... rest of existing hook logic unchanged ...

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

### Admin Layout with All Checks
```typescript
// Source: Synthesized from existing patterns + Supabase MFA docs

import { requireSuperAdmin } from '@/lib/auth/admin-authorize';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AbilityProvider } from '@/components/permissions/ability-provider';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify super admin (database check)
  const user = await requireSuperAdmin();

  // 2. Verify MFA enrolled and verified
  const supabase = await createClient();
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factors } = await supabase.auth.mfa.listFactors();

  // No TOTP factors enrolled
  if (!factors?.totp?.length) {
    redirect('/mfa-setup?required=admin');
  }

  // MFA enrolled but not verified this session
  if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
    redirect('/mfa-verify?redirect=/admin');
  }

  // 3. Build admin context for CASL
  const adminContext = {
    userId: user.id,
    clubId: '',
    roles: [] as const,
    viewMode: null as const,
    isSuperAdmin: true,
  };

  return (
    <AbilityProvider user={adminContext}>
      <div className="min-h-screen bg-[var(--background)]">
        <AdminSidebar />
        <main className="pl-64">{children}</main>
      </div>
    </AbilityProvider>
  );
}
```

### Supabase Session Timeout Configuration

**Important:** Session timeout is configured in the Supabase Dashboard, not in code.

```
Supabase Dashboard > Authentication > URL Configuration > Sessions

Settings to configure:
- Inactivity Timeout: 1800 seconds (30 minutes) - AUTH-03 requirement
- Time-box user sessions: (optional, for absolute session limit)

Note: These settings apply to ALL users, not just admins.
For admin-specific timeout, implement client-side inactivity detection.
```

For admin-specific 30-minute timeout (if Supabase-wide setting is undesirable):
```typescript
// Client-side inactivity detection
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ADMIN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useAdminSessionTimeout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login?timeout=admin');
    }, ADMIN_TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimeout));
    resetTimeout();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimeout));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Role in JWT only | Database-verified roles | Security best practice | Immediate revocation possible |
| SMS-based MFA | TOTP (authenticator app) | Industry trend 2023+ | More secure, no SIM-swap risk |
| Middleware route protection | Layout-based protection | Next.js 13+ App Router | More reliable, runs on every render |
| Custom audit tables | Unified AuditLog model | Already in codebase | Consistent logging across features |

**Deprecated/outdated:**
- Next.js middleware edge runtime: Being replaced by `proxy.ts` in Next.js 16+, but `middleware.ts` still works
- Supabase `getSession()` for auth verification: Use `getUser()` instead (verifies JWT with server)

## Open Questions

Things that couldn't be fully resolved:

1. **Admin-specific session timeout vs Supabase-wide**
   - What we know: Supabase inactivity timeout applies to ALL users
   - What's unclear: Is 30-minute timeout acceptable for regular users too, or admin-only?
   - Recommendation: If admin-only, implement client-side timeout hook; if acceptable for all, use Supabase dashboard setting

2. **Super admin count limits**
   - What we know: CONTEXT.md says Claude's discretion on "count limits/warnings"
   - What's unclear: Is there a practical limit (2? 5? unlimited)?
   - Recommendation: No hard limit in Phase 36; add warning UI if >3 super admins exist

3. **Audit log "before state" capture**
   - What we know: AUDT-01 requires before/after state
   - What's unclear: Best pattern for capturing "before" state without extra query
   - Recommendation: Fetch record before mutation, include both in metadata; consider Prisma middleware for automation in future

## Sources

### Primary (HIGH confidence)
- [Supabase MFA TOTP Documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp) - Enrollment, challenge, verify flow
- [Supabase MFA JavaScript API](https://supabase.com/docs/reference/javascript/auth-mfa-api) - API method signatures
- [Supabase Sessions Guide](https://supabase.com/docs/guides/auth/sessions) - Timeout configuration
- [CASL Documentation](https://casl.js.org/) - `manage` and `all` keywords
- Existing codebase: `src/lib/auth/authorize.ts`, `src/lib/permissions/ability.ts`, `src/lib/audit/logger.ts`
- Existing research: `.planning/research/admin-panel-STACK.md` (detailed stack decisions)

### Secondary (MEDIUM confidence)
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) - `(admin)` pattern
- [FreeCodeCamp: Secure Routes in Next.js](https://www.freecodecamp.org/news/secure-routes-in-next-js/) - Layout-based protection pattern

### Tertiary (LOW confidence)
- WebSearch results for session timeout patterns - verified against Supabase docs
- WebSearch results for audit logging patterns - verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified versions
- Architecture: HIGH - Patterns derived from existing codebase + official docs
- Pitfalls: HIGH - Based on common security anti-patterns + project-specific context

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days - stable technologies)

---

## Quick Reference: Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| AUTH-01: SuperAdmin table | Prisma model with userId unique index |
| AUTH-02: Database verification every request | `requireSuperAdmin()` in admin layout |
| AUTH-03: 30-minute timeout | Supabase Auth settings OR client-side hook |
| AUTH-04: CASL `can('manage', 'all')` | `isSuperAdmin` flag in UserContext |
| AUTH-05: `(admin)` route group | Separate route group with own layout |
| AUTH-06: MFA enforcement | AAL check in admin layout |
| AUDT-01: Admin action logging | `logAdminAction()` with before/after metadata |
