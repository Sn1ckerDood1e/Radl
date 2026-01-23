# Phase 13: Facility Auth Integration - Research

**Researched:** 2026-01-23
**Domain:** Multi-tenant hierarchical authentication and permissions
**Confidence:** HIGH

## Summary

Phase 13 integrates the facility hierarchy (created in Phase 12) into the authentication flow. This involves context switching between facilities and clubs, updating CASL abilities when context changes, cache invalidation strategies, and implementing facility admin read-only drill-down patterns.

The existing codebase already has:
- Cookie-based club context (club-context.ts)
- JWT claims injection via custom_access_token_hook (facility_id, club_id, user_roles)
- CASL ability factory (defineAbilityFor) with club-scoped permissions
- RLS helper functions for facility/club/role checks
- Club switcher UI component with router.push() + router.refresh()

The research confirms that the current approach is sound, but identifies key integration points:
1. Extend context switching to support facility-level context
2. Update CASL ability factory to handle facility admin permissions
3. Implement proper cache invalidation on context switch
4. Handle JWT session refresh to update claims

**Primary recommendation:** Use cookie update → session refresh → router.refresh() pattern for context switching. CASL abilities should be recomputed server-side on each request based on current cookie context, avoiding client-side ability updates.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @casl/ability | ^6.8.0 | Permission rules engine | Isomorphic (client/server), type-safe, condition-based rules |
| @casl/prisma | ^1.6.1 | Prisma query integration | Translates CASL conditions to Prisma WHERE clauses for database-level enforcement |
| @casl/react | ^5.0.1 | React integration | Provides Can component and useAbility hook with context support |
| next | 16.1.3 | Framework | App Router with Server Components, built-in caching, server actions |
| react | 19.2.3 | UI library | React 19 includes automatic compiler for optimized re-renders |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Auth | latest | Session management | JWT session refresh, custom claims hooks |
| jwt-decode | latest | JWT parsing | Client-side claims extraction (after server validation) |
| Next.js cookies | built-in | Context storage | HttpOnly cookies for facility/club selection (XSS-safe) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cookie context | Session storage | Cookies persist across tabs, work server-side; session storage is tab-isolated |
| CASL | Custom permission logic | CASL provides isomorphic checks, Prisma integration, and @casl/react components |
| JWT claims | Database lookup per request | JWT claims cached in token (faster), but require refresh on context change |

**Installation:**
All dependencies already installed in package.json.

## Architecture Patterns

### Recommended Context Flow
```
User action → API endpoint → Cookie update → Response → Client refresh
                                                              ↓
                                                   router.refresh()
                                                              ↓
                                            Server re-renders with new cookie
                                                              ↓
                                                JWT refresh triggered
                                                              ↓
                                            New claims: facility_id, club_id
                                                              ↓
                                            CASL ability recomputed
```

### Pattern 1: Context Switching (Club/Facility)
**What:** User switches between clubs or to facility-level view via dropdown
**When to use:** Multi-club or facility admin users

**Existing Implementation (Club Switch):**
```typescript
// Source: /home/hb/rowops/src/app/api/clubs/switch/route.ts
export async function POST(request: NextRequest) {
  const { user } = await getClaimsForApiRoute();
  const { clubId } = await request.json();

  // Verify membership
  const membership = await prisma.clubMembership.findFirst({
    where: { clubId, userId: user.id, isActive: true }
  });

  if (!membership) return forbiddenResponse('Not a member of this club');

  // Update cookie
  await setCurrentClubId(clubId);

  return NextResponse.json({ success: true, club: membership.club });
}

// Client-side handler
async function handleSwitch(clubId: string) {
  const response = await fetch('/api/clubs/switch', {
    method: 'POST',
    body: JSON.stringify({ clubId })
  });

  if (response.ok) {
    router.push(`/${data.club.slug}`);
    router.refresh(); // Invalidate client cache, trigger server re-render
  }
}
```

**Facility Extension:**
- Add facility context cookie alongside club context
- When switching to facility view, set facilityId cookie but clear clubId
- When switching to club view, set both facilityId and clubId
- JWT hook reads both cookies and injects into claims

### Pattern 2: CASL Ability Factory (Server-Side Only)
**What:** Compute user abilities based on current context (from cookies/JWT)
**When to use:** Every server request, ability passed to client via props

**Current Implementation:**
```typescript
// Source: /home/hb/rowops/src/lib/permissions/ability.ts
export interface UserContext {
  userId: string;
  clubId: string;
  roles: ('FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[];
  linkedAthleteIds?: string[];
}

export function defineAbilityFor(user: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  if (user.roles.includes('FACILITY_ADMIN')) {
    can('manage', 'Team'); // All teams in facility
    can('read', 'Practice');
    can('read', 'Lineup');
    // Cannot create/update lineups (needs COACH role)
  }

  if (user.roles.includes('CLUB_ADMIN')) {
    can('manage', 'Team', { id: user.clubId });
    // Scoped to specific club
  }

  return build();
}
```

**Facility Extension:**
- Add `facilityId?: string` to UserContext
- Add `viewMode: 'facility' | 'club'` to distinguish facility vs club context
- FACILITY_ADMIN in facility view: broad read permissions, no club-specific filters
- FACILITY_ADMIN in club view: same as club context, subject to that club's data
- Update ability conditions to check viewMode

### Pattern 3: Session Refresh After Context Switch
**What:** Update JWT claims to reflect new facility/club context
**When to use:** After cookie update via context switch API

**Supabase Session Refresh:**
```typescript
// One drawback: claims don't get updated automatically
// You can force a refresh by calling supabase.auth.refreshSession()
// Source: https://supabase.com/docs/guides/auth/sessions

// Option 1: Client-side refresh (explicit)
async function handleSwitch(clubId: string) {
  await fetch('/api/clubs/switch', { method: 'POST', body: JSON.stringify({ clubId }) });

  const supabase = createClient();
  await supabase.auth.refreshSession(); // Force JWT regeneration

  router.refresh(); // Re-render with new abilities
}

// Option 2: Server-side refresh (transparent)
// API route triggers session refresh before returning
export async function POST(request: NextRequest) {
  await setCurrentClubId(clubId);

  // Trigger session refresh to update JWT claims
  const supabase = await createClient();
  await supabase.auth.refreshSession();

  return NextResponse.json({ success: true });
}
```

**Key constraints:**
- Custom access token hook has 5-second timeout (auth hooks specifically)
- Hook runs on every token refresh, must stay simple
- JWT size matters for SSR frameworks - keep claims minimal
- Refresh tokens can be used multiple times within 10-second reuse interval

**Recommended approach:** Client-side explicit refresh after context switch
- Server responds immediately (no delay waiting for auth system)
- Client controls refresh timing
- Clear separation of concerns

### Pattern 4: Cache Invalidation Strategy
**What:** Invalidate Next.js caches when context changes
**When to use:** After context switch to prevent stale data display

**Next.js 15+ Cache Layers:**
```typescript
// Source: Next.js 15 caching documentation
// https://nextjs.org/docs/app/getting-started/caching-and-revalidating

// Option 1: router.refresh() (Client-side)
// Invalidates Router Cache for current route only
// Dynamic pages NOT cached by default in Next.js 15
router.refresh();

// Option 2: revalidatePath (Server Action)
// Server action automatically invalidates client cache via special headers
'use server';
export async function switchContext(clubId: string) {
  await setCurrentClubId(clubId);
  revalidatePath('/', 'layout'); // Invalidate entire layout
}

// Option 3: revalidateTag (Tagged cache)
// Tag facility/club-specific data
const data = await fetch('...', { next: { tags: [`club-${clubId}`] } });
// Then invalidate
revalidateTag(`club-${clubId}`, 'max'); // Stale-while-revalidate

// Option 4: updateTag (Server Actions only)
// Immediate expiration, no stale content
updateTag(`club-${clubId}`);
```

**Key differences:**
- `router.refresh()`: Client-side, current route only, works with API routes
- `revalidatePath()`: Server action, can specify layout scope
- `revalidateTag()`: Granular, stale-while-revalidate semantics
- `updateTag()`: Server actions only, immediate expiration

**Recommended approach for context switching:**
1. Use API route (not server action) for switch endpoint - allows pre-switch validation
2. Call `router.refresh()` client-side after successful switch
3. Optional: Tag facility/club data with `next: { tags: [...] }` for granular invalidation
4. Full page navigation via `router.push()` ensures clean state

### Pattern 5: Facility Admin Read-Only Drill-Down
**What:** Facility admin views aggregate data and can drill into specific clubs (read-only)
**When to use:** FACILITY_ADMIN role viewing club-specific data

**UI Pattern:**
```typescript
// Facility view: Show aggregate data
if (viewMode === 'facility' && roles.includes('FACILITY_ADMIN')) {
  // Dashboard shows all clubs, aggregated stats
  // Equipment list shows FACILITY-owned equipment
  // Can click into specific club for detail view
}

// Club drill-down: Switch context to specific club
function viewClubDetails(clubId: string) {
  // Switch to club context
  await switchContext(clubId);
  // Abilities recomputed: FACILITY_ADMIN can 'read' but not 'manage' in club view
  // UI shows club detail, but edit buttons hidden (Can component checks)
}
```

**Permission model:**
- FACILITY_ADMIN in facility context: `can('read', 'Practice')` (no club filter)
- FACILITY_ADMIN in club context: `can('read', 'Practice', { clubId: currentClubId })`
- No special "impersonation" - just context switching with read-only enforcement
- CASL conditions enforce read-only: no `can('manage', ...)` for FACILITY_ADMIN

### Anti-Patterns to Avoid

- **Client-side ability updates:** Don't call `ability.update(rules)` on client. Abilities should be recomputed server-side based on current cookie context. Client state drift is dangerous.

- **Stale JWT claims:** Don't assume JWT claims reflect current cookie context. Always refresh session after context switch.

- **Eager cache invalidation:** Don't use `updateTag()` or `revalidateTag(..., 0)` for context switches - causes layout shift. Use `router.refresh()` for controlled re-render.

- **Database lookups in JWT hook:** Custom access token hook has 5-second timeout. Keep it to simple queries (1-2 JOINs max). Complex permission logic belongs in ability factory, not JWT hook.

- **Role inheritance in CASL:** Don't assume FACILITY_ADMIN can do everything CLUB_ADMIN can. Explicitly grant permissions per role (no-inheritance RBAC).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission caching | Manual ability memoization | React.useMemo in AbilityProvider | React 19 auto-compiler optimizes; manual caching causes stale permissions |
| Context synchronization across tabs | Custom localStorage sync | Browser default cookie behavior | Cookies auto-sync across tabs; custom sync is race-condition prone |
| Session refresh timing | Custom token expiry tracking | Supabase auto-refresh | Supabase refreshes <60min before expiry; custom logic misses edge cases |
| Router cache invalidation | Manual cache busting params | router.refresh() | Next.js 15 Router Cache invalidation API handles all layers correctly |
| Hierarchical permission checks | Custom role hierarchy logic | CASL conditions + @casl/prisma | CASL translates conditions to Prisma WHERE; hand-rolled logic misses database enforcement |

**Key insight:** Multi-tenant context switching has many subtle failure modes (stale caches, cookie/JWT drift, tab synchronization, race conditions). Use proven primitives (cookies, JWT refresh, router.refresh) rather than building custom state management.

## Common Pitfalls

### Pitfall 1: Cookie/JWT Claim Drift
**What goes wrong:** Cookie updated to new clubId, but JWT still has old club_id claim. Ability checks pass (based on JWT), but RLS policies fail (based on cookie-driven query context).

**Why it happens:**
- Cookie update is synchronous
- JWT refresh is asynchronous
- Window between cookie change and JWT refresh where claims are stale

**How to avoid:**
- Always call `supabase.auth.refreshSession()` after context switch
- Wait for refresh to complete before navigation
- Server-side code should prefer cookie-based context lookup over JWT claims for current context

**Warning signs:**
- RLS policy violations after context switch
- "Forbidden" errors immediately after switching clubs
- User sees "No club selected" after switch

### Pitfall 2: Next.js 15 Router Cache Assumptions
**What goes wrong:** Calling API route to switch context, but UI shows stale data because Router Cache not invalidated.

**Why it happens:**
- Next.js 15 changed Router Cache behavior: dynamic pages opted out by default
- But static pages/layouts still cached
- API routes don't auto-invalidate cache (unlike server actions)

**How to avoid:**
- Always call `router.refresh()` after API route mutations
- Consider using server actions for context switch (auto-invalidation)
- Tag facility/club data with `next.tags` for granular control

**Warning signs:**
- Club name in header doesn't update after switch
- Dashboard shows old club's data after context switch
- Refresh (F5) fixes the issue

### Pitfall 3: CASL Ability Context Provider Re-Renders
**What goes wrong:** AbilityProvider re-renders on every parent update, causing permission checks to trigger expensive re-computations.

**Why it happens:**
- UserContext object recreated on every render (new object reference)
- useMemo dependency check fails
- Ability recomputed unnecessarily

**How to avoid:**
- Server-side: Pass stable UserContext object (from API route/layout)
- Client-side: Use React.useMemo with proper dependencies
- React 19's auto-compiler helps, but not guaranteed for all cases

**Example:**
```typescript
// BAD: New object every render
<AbilityProvider user={{ userId, clubId, roles }}>

// GOOD: Stable reference
const userContext = useMemo(
  () => ({ userId, clubId, roles }),
  [userId, clubId, roles] // Only recreate if these change
);
<AbilityProvider user={userContext}>
```

**Warning signs:**
- Console logs show ability factory called repeatedly
- UI feels sluggish when toggling components
- React DevTools Profiler shows AbilityProvider re-rendering

### Pitfall 4: Custom Access Token Hook Timeout
**What goes wrong:** Custom access token hook times out (>5 seconds), preventing user login or session refresh.

**Why it happens:**
- Complex database queries in hook (multiple JOINs, aggregations)
- N+1 query pattern (fetching roles for each club membership)
- Database connection pool exhaustion under load

**How to avoid:**
- Keep hook to 1-2 simple queries (ClubMembership JOIN Team)
- Use LIMIT 1 for single-membership users
- Index critical columns (userId, clubId, isActive)
- Test with realistic production data volume

**Current implementation:** GOOD
```sql
-- Source: /home/hb/rowops/supabase/migrations/00006_facility_access_token_hook.sql
SELECT t."facilityId", cm."clubId", cm.roles
FROM public."ClubMembership" cm
JOIN public."Team" t ON t.id = cm."clubId"
WHERE cm."userId" = (event->>'user_id') AND cm."isActive" = true
LIMIT 1;
```
- Single JOIN, indexed columns, LIMIT 1
- Estimated execution time: <50ms (well under 5s limit)

**Warning signs:**
- "Failed to reach hook within maximum time of 5.000000 seconds" errors
- Users unable to log in or refresh session
- Database CPU spikes during login hours

### Pitfall 5: Facility Admin Permission Confusion
**What goes wrong:** FACILITY_ADMIN expects to edit club data but permissions denied. Or worse, FACILITY_ADMIN accidentally gets full edit access when they should be read-only.

**Why it happens:**
- No-inheritance RBAC: FACILITY_ADMIN role doesn't imply COACH/CLUB_ADMIN permissions
- Ambiguous UI: edit buttons shown but click fails (bad UX)
- Or: permission check omitted, allowing unintended writes

**How to avoid:**
- CASL ability: FACILITY_ADMIN gets 'read' only, not 'manage'
- UI: Use `<Can I="update" a="Practice">` to hide edit buttons
- Don't show disabled buttons - hide unavailable actions entirely
- Server-side: Always check ability before mutations, never trust client

**Decision from CONTEXT.md:**
- Facility admin data access: Read-only drill-down (can view but not modify)
- Permission denied UI: Hide unavailable actions/pages entirely

**Warning signs:**
- FACILITY_ADMIN seeing edit buttons that don't work
- Support tickets: "I'm a facility admin but can't edit lineups" (expected)
- Audit logs showing FACILITY_ADMIN edit attempts

## Code Examples

Verified patterns from official sources and current implementation:

### Facility Context Switch API
```typescript
// Source: Adapted from /home/hb/rowops/src/app/api/clubs/switch/route.ts

// POST /api/facility/switch
export async function POST(request: NextRequest) {
  const { user, error } = await getClaimsForApiRoute();
  if (error || !user) return unauthorizedResponse();

  const { facilityId, clubId } = await request.json();

  // Switching to facility-level view
  if (facilityId && !clubId) {
    // Verify user is facility member
    const membership = await prisma.facilityMembership.findFirst({
      where: { facilityId, userId: user.id, isActive: true }
    });
    if (!membership) return forbiddenResponse('Not a member of this facility');

    // Set facility context, clear club context
    await setCurrentFacilityId(facilityId);
    await clearCurrentClubId();

    return NextResponse.json({ success: true, viewMode: 'facility' });
  }

  // Switching to club view (within facility)
  if (facilityId && clubId) {
    const membership = await prisma.clubMembership.findFirst({
      where: { clubId, userId: user.id, isActive: true },
      include: { club: { select: { facilityId: true } } }
    });

    if (!membership || membership.club.facilityId !== facilityId) {
      return forbiddenResponse('Not a member of this club');
    }

    await setCurrentFacilityId(facilityId);
    await setCurrentClubId(clubId);

    return NextResponse.json({ success: true, viewMode: 'club' });
  }

  return NextResponse.json({ error: 'Invalid context' }, { status: 400 });
}
```

### CASL Ability with Facility Context
```typescript
// Source: Extended from /home/hb/rowops/src/lib/permissions/ability.ts

export interface UserContext {
  userId: string;
  facilityId?: string;
  clubId?: string;
  roles: ('FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[];
  viewMode: 'facility' | 'club';
  linkedAthleteIds?: string[];
}

export function defineAbilityFor(user: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  if (user.roles.includes('FACILITY_ADMIN')) {
    if (user.viewMode === 'facility') {
      // Facility-wide read access, no club filter
      can('read', 'Team'); // All teams in facility
      can('read', 'Practice'); // All practices
      can('read', 'Equipment', { ownerType: 'FACILITY' }); // Facility equipment only
      can('view-audit-log', 'AuditLog'); // All facility audit logs
      can('manage', 'Facility', { id: user.facilityId }); // Can edit facility profile

    } else if (user.viewMode === 'club' && user.clubId) {
      // Club-specific read access when drilling down
      can('read', 'Team', { id: user.clubId });
      can('read', 'Practice', { teamId: user.clubId });
      can('read', 'Equipment', { clubId: user.clubId });
      can('view-audit-log', 'AuditLog'); // Filtered server-side to this club
      // Still cannot manage/edit in club view (read-only drill-down)
    }
  }

  // CLUB_ADMIN, COACH, etc. - same as before
  if (user.roles.includes('CLUB_ADMIN') && user.clubId) {
    can('manage', 'Team', { id: user.clubId });
    // ... rest of CLUB_ADMIN permissions
  }

  return build();
}
```

### Client-Side Context Switch with Session Refresh
```typescript
// Source: Adapted from /home/hb/rowops/src/components/layout/club-switcher.tsx

async function handleFacilitySwitch(facilityId: string, clubId?: string) {
  setIsSwitching(true);

  try {
    // 1. Update context via API
    const response = await fetch('/api/facility/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId, clubId })
    });

    if (!response.ok) throw new Error('Switch failed');

    // 2. Refresh JWT session to update claims
    const supabase = createClient();
    const { error } = await supabase.auth.refreshSession();
    if (error) console.error('Session refresh failed:', error);

    // 3. Navigate and invalidate cache
    const newPath = clubId
      ? `/${clubData.slug}`
      : `/facility/${facilityData.slug}`;

    router.push(newPath);
    router.refresh(); // Invalidate Router Cache, trigger server re-render

  } catch (error) {
    console.error('Context switch failed:', error);
  } finally {
    setIsSwitching(false);
  }
}
```

### AbilityProvider Server-Side Usage
```typescript
// Source: /home/hb/rowops/src/components/permissions/ability-provider.tsx
// Pattern: Server component passes user context as prop

// app/(dashboard)/layout.tsx (Server Component)
export default async function DashboardLayout({ children }) {
  const { user, facilityId, clubId, roles } = await getClaimsForApiRoute();

  // Determine view mode from cookies
  const viewMode = clubId ? 'club' : (facilityId ? 'facility' : null);

  const userContext: UserContext = {
    userId: user.id,
    facilityId,
    clubId,
    roles,
    viewMode,
  };

  return (
    <AbilityProvider user={userContext}>
      {children}
    </AbilityProvider>
  );
}

// Client Component: useAbility hook
'use client';
function CreatePracticeButton() {
  const ability = useAbility();

  // Hide button if no permission (don't show disabled state)
  if (!ability.can('create', 'Practice')) {
    return null;
  }

  return <button>Create Practice</button>;
}
```

### Tagged Cache Invalidation
```typescript
// Source: https://nextjs.org/docs/app/getting-started/caching-and-revalidating

// Tag facility/club-specific data
export async function getClubPractices(clubId: string) {
  const practices = await fetch(`/api/clubs/${clubId}/practices`, {
    next: {
      tags: [`club-${clubId}`, 'practices'],
      revalidate: 60 // Optional: time-based revalidation
    }
  });
  return practices.json();
}

// Server action: Invalidate on context switch
'use server';
export async function switchToClub(clubId: string) {
  await setCurrentClubId(clubId);

  // Invalidate previous club's cache
  const { clubId: previousClubId } = await getClaimsForApiRoute();
  if (previousClubId) {
    revalidateTag(`club-${previousClubId}`, 'max');
  }

  // Invalidate layout to re-fetch club data
  revalidatePath('/', 'layout');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session storage for context | HttpOnly cookies | Phase 9 (multi-club) | Cookies work server-side, persist across tabs, XSS-safe |
| Client-side permission state | Server-side ability factory | Phase 10 (RBAC) | Prevents client-side permission tampering |
| Manual cache clearing | router.refresh() API | Next.js 13+ App Router | Automatic cache invalidation, fewer bugs |
| Static JWT claims | Custom access token hook | Phase 12 (facility model) | Dynamic claims based on DB, updated on session refresh |
| Next.js 14 Router Cache | Next.js 15 opt-out caching | Next.js 15 (Nov 2024) | Dynamic pages not cached by default, less aggressive invalidation needed |
| revalidatePath with expire: 0 | revalidateTag('tag', 'max') or updateTag | Next.js 15 RC | Stale-while-revalidate semantics, better UX |

**Deprecated/outdated:**
- **ability.update(rules) client-side:** CASL allows updating ability instance on client, but this creates state drift in multi-tenant apps. Current pattern: recompute server-side based on cookie context.
- **getServerSideProps:** Pages Router pattern. App Router uses Server Components with async getClaimsForApiRoute().
- **NextAuth session callbacks:** Not applicable (using Supabase Auth). NextAuth refresh token rotation patterns don't apply.

## Open Questions

Things that couldn't be fully resolved:

1. **Facility admin shared equipment management**
   - What we know: Equipment model has `ownerType: FACILITY | CLUB | TEAM` field, FACILITY_ADMIN can read FACILITY-owned equipment
   - What's unclear: Can FACILITY_ADMIN create/edit FACILITY-owned equipment? Or only view it?
   - Recommendation: Allow FACILITY_ADMIN to manage FACILITY-owned equipment (makes sense for boathouse boats), restrict CLUB/TEAM-owned equipment to CLUB_ADMIN/COACH. Implement in planning phase based on user stories.

2. **Cross-club data comparisons for facility admin**
   - What we know: FACILITY_ADMIN can view all clubs' data in facility view mode
   - What's unclear: Should there be a comparison/analytics view? Or just drill-down into individual clubs?
   - Recommendation: Defer to Phase 17 (Facility UI features). Phase 13 provides the foundation (facility view mode, read permissions), comparison UI is enhancement.

3. **Invalid context fallback behavior**
   - What we know: If user's clubId cookie points to club they're no longer member of, need graceful fallback
   - What's unclear: Redirect to club selection page? Auto-select first available club? Show error?
   - Recommendation: Auto-select first available club from user's memberships, log warning to console. If no memberships, redirect to onboarding/club selection. Implement validation in getClaimsForApiRoute().

4. **Super admin bypass for FACILITY_ADMIN**
   - What we know: FACILITY_ADMIN is scoped to facility, not app-wide super admin
   - What's unclear: Should there be a SUPER_ADMIN role with cross-facility access? Or is FACILITY_ADMIN the top role?
   - Recommendation: No SUPER_ADMIN needed yet. If multi-facility management needed later (e.g., SaaS admin), add separate role. For now, FACILITY_ADMIN is top of hierarchy within their facility.

## Sources

### Primary (HIGH confidence)
- Supabase Auth Sessions - https://supabase.com/docs/guides/auth/sessions
- Supabase Custom Access Token Hook - https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Supabase Edge Functions Limits - https://supabase.com/docs/guides/functions/limits
- Next.js 15 Caching and Revalidating - https://nextjs.org/docs/app/getting-started/caching-and-revalidating
- CASL Prisma Documentation - https://casl.js.org/v5/en/package/casl-prisma/
- CASL React Documentation - https://casl.js.org/v4/en/package/casl-react/
- Current codebase implementations (ability.ts, club-switcher.tsx, claims.ts, facility RLS helpers)

### Secondary (MEDIUM confidence)
- [WorkOS Multi-Tenant RBAC Design](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas) - Hierarchical permissions patterns
- [Next.js Router Cache Discussion](https://github.com/vercel/next.js/discussions/54075) - Deep dive on caching behavior
- [CASL Hierarchical Policies Discussion](https://github.com/stalniy/casl/discussions/1001) - Community patterns for relational permissions

### Tertiary (LOW confidence)
- WebSearch results on Next.js context switching patterns (not official docs, marked for validation)
- WebSearch results on multi-tenant authorization best practices (general guidance, not Next.js/CASL specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in package.json, versions confirmed
- Architecture: HIGH - Patterns verified in current codebase (club-switcher.tsx, ability.ts) and official Next.js/Supabase docs
- Pitfalls: HIGH - Identified from official Supabase limits docs, Next.js 15 changelog, current implementation code review
- Code examples: HIGH - Adapted from actual codebase files and official documentation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable stack, but Next.js/Supabase evolve quickly)
