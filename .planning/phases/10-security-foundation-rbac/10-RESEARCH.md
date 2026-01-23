# Phase 10: Security Foundation & RBAC - Research

**Researched:** 2026-01-22
**Domain:** Role-based access control, multi-tenant permissions, audit logging, API key authentication
**Confidence:** HIGH

## Summary

This phase implements a bulletproof role hierarchy and tenant-scoped permissions foundation for a multi-club rowing management application. The existing codebase has a basic 3-role system (COACH, ATHLETE, PARENT) with single-team membership. Phase 10 expands this to a 5-role hierarchy (FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT) with multi-club membership support, while adding audit logging, secure session management, and API key authentication.

The standard approach is to:
1. Use **@casl/ability** + **@casl/prisma** + **@casl/react** for isomorphic permission management
2. Extend the Prisma schema with new tables: `ClubMembership`, `AuditLog`, `ApiKey`
3. Implement Prisma Client Extension for automatic audit logging on security-critical operations
4. Add API key authentication via middleware with SHA-256 hashed storage
5. Build club context switching with cookie-based session state

**Primary recommendation:** Define CASL abilities per-role without inheritance (explicit role composition), use Prisma extension for audit logging, store API key hashes with `sk_` prefix pattern, and implement club switcher in dashboard header with cookie-persisted last-visited club.

## Current State Analysis

### Existing Auth Implementation

The codebase has a working Supabase Auth setup with:

**`src/lib/auth/claims.ts`** - Centralized JWT claims helper:
- `CustomJwtPayload` interface with `team_id` and `user_role` (COACH | ATHLETE | PARENT)
- `getClaimsForApiRoute()` - Validates auth via `getUser()`, decodes JWT, has database fallback for stale claims
- Database fallback queries `TeamMember` when JWT claims are null

**`src/lib/auth/authorize.ts`** - Server Component auth helpers:
- `getAuthUser()`, `getUserClaims()`, `requireAuth()`, `requireTeam()`, `requireRole()`
- Role checking: `isCoach()`, `canViewRoster()`, `canViewLineups()`

**`src/middleware.ts`** - Route protection:
- Public routes: `/login`, `/signup`, `/auth/callback`, `/join/*`, `/report/*`
- Uses `@supabase/ssr` createServerClient for cookie-based auth
- Properly uses `getUser()` (not `getSession()`) for JWT validation

**Current Role Enum** (in `schema.prisma`):
```prisma
enum Role {
  COACH
  ATHLETE
  PARENT
}
```

**Current TeamMember Model**:
```prisma
model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  userId    String
  role      Role
  // ... single team per membership
}
```

### What Needs to Change

1. **Role Enum**: Expand from 3 to 5 roles
2. **Membership Model**: Support multiple clubs per user with different roles
3. **Claims**: Include current club context and all user roles
4. **Permission Checks**: Replace simple role checks with CASL abilities
5. **Audit Logging**: Add for security-critical operations
6. **API Keys**: New table and middleware validation

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @casl/ability | ^6.7.2 | Define/check permissions | De facto RBAC library for JS, isomorphic, 10M+ weekly downloads |
| @casl/prisma | ^1.5.2 | Prisma WhereInput conditions | Official CASL package for Prisma query filtering |
| @casl/react | ^4.0.0 | React hooks/components | Official CASL React bindings, useAbility hook, Can component |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (built-in) | Node.js | SHA-256 API key hashing | API key storage, secure comparison |
| nanoid | ^5.1.6 | Generate API keys | Already in project, URL-safe random strings |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CASL | Permit.io, Casbin | CASL is simpler, no external service, decision per context noted |
| Prisma extension audit | PostgreSQL triggers | Triggers are more robust but require raw SQL, lose Prisma type safety |
| Cookie club context | JWT claims refresh | Cookies are immediate, JWT refresh has delay |

**Installation:**
```bash
npm install @casl/ability @casl/prisma @casl/react
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth/
│   │   ├── authorize.ts       # Existing - add club context
│   │   ├── claims.ts          # Existing - extend for multi-club
│   │   └── api-key.ts         # NEW: API key validation
│   ├── permissions/
│   │   ├── ability.ts         # NEW: CASL ability factory
│   │   ├── actions.ts         # NEW: Action definitions
│   │   └── subjects.ts        # NEW: Subject definitions
│   └── audit/
│       └── logger.ts          # NEW: Audit log helpers
├── components/
│   ├── permissions/
│   │   ├── ability-provider.tsx  # NEW: React context
│   │   └── can.tsx               # NEW: Bound Can component
│   └── layout/
│       └── club-switcher.tsx     # NEW: Header club dropdown
```

### Pattern 1: CASL Ability Factory (Role-Specific, No Inheritance)

Per the decision in CONTEXT.md: "Role-specific permissions only - higher roles do NOT inherit lower-role permissions."

```typescript
// src/lib/permissions/ability.ts
import { AbilityBuilder, PureAbility, subject } from '@casl/ability';
import { createPrismaAbility, PrismaQuery, Subjects } from '@casl/prisma';
import type {
  Team, Practice, Lineup, Equipment, AthleteProfile, Season
} from '@prisma/client';

// Subject types for CASL
type AppSubjects = Subjects<{
  Team: Team;
  Practice: Practice;
  Lineup: Lineup;
  Equipment: Equipment;
  AthleteProfile: AthleteProfile;
  Season: Season;
  AuditLog: { clubId: string };
  ApiKey: { clubId: string; createdBy: string };
}>;

type AppAbility = PureAbility<[string, AppSubjects | 'all'], PrismaQuery>;

// Actions matching security-critical operations
type Action =
  | 'manage' // All CRUD
  | 'create' | 'read' | 'update' | 'delete'
  | 'assign-role' | 'view-audit-log' | 'export-data'
  | 'manage-api-keys' | 'invite-member' | 'remove-member';

interface UserContext {
  userId: string;
  clubId: string;
  roles: ('FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[];
  linkedAthleteIds?: string[]; // For PARENT role
}

export function defineAbilityFor(user: UserContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  // FACILITY_ADMIN - manages all clubs in facility
  if (user.roles.includes('FACILITY_ADMIN')) {
    can('manage', 'Team'); // All clubs
    can('assign-role', 'Team');
    can('view-audit-log', 'AuditLog'); // All audit logs
    can('export-data', 'Team');
    can('manage-api-keys', 'ApiKey');
    can('invite-member', 'Team');
    can('remove-member', 'Team');
    // NOTE: Cannot create lineups unless also COACH
  }

  // CLUB_ADMIN - manages their specific club
  if (user.roles.includes('CLUB_ADMIN')) {
    can('manage', 'Team', { id: user.clubId });
    can('assign-role', 'Team', { id: user.clubId });
    can('view-audit-log', 'AuditLog', { clubId: user.clubId });
    can('export-data', 'Team', { id: user.clubId });
    can('manage-api-keys', 'ApiKey', { clubId: user.clubId });
    can('invite-member', 'Team', { id: user.clubId });
    can('remove-member', 'Team', { id: user.clubId });
    can('read', 'Practice', { teamId: user.clubId });
    can('read', 'Equipment', { teamId: user.clubId });
    can('read', 'AthleteProfile'); // View roster
    // NOTE: Cannot create/edit lineups unless also COACH
  }

  // COACH - creates lineups, manages practices
  if (user.roles.includes('COACH')) {
    can('manage', 'Practice', { teamId: user.clubId });
    can('manage', 'Lineup', { teamId: user.clubId });
    can('manage', 'Equipment', { teamId: user.clubId });
    can('read', 'AthleteProfile'); // View all athletes for lineup
    can('view-audit-log', 'AuditLog', {
      clubId: user.clubId,
      userId: user.userId
    }); // Own actions only
  }

  // ATHLETE - views their own data and team schedule
  if (user.roles.includes('ATHLETE')) {
    can('read', 'Practice', { teamId: user.clubId, status: 'PUBLISHED' });
    can('read', 'Lineup', { teamId: user.clubId }); // See lineups they're in
    can('read', 'Equipment', { teamId: user.clubId }); // Boat info
    can('update', 'AthleteProfile', { teamMemberId: user.userId }); // Own profile
  }

  // PARENT - sees linked athlete(s) data + schedule
  if (user.roles.includes('PARENT') && user.linkedAthleteIds?.length) {
    can('read', 'Practice', { teamId: user.clubId, status: 'PUBLISHED' });
    can('read', 'AthleteProfile', { id: { in: user.linkedAthleteIds } });
    // Can see lineups containing their athlete (filtered server-side)
    can('read', 'Lineup', { teamId: user.clubId });
    // Note: Parent sees filtered lineup, not all athletes
  }

  return build();
}
```

### Pattern 2: React Ability Context

```typescript
// src/components/permissions/ability-provider.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createContextualCan } from '@casl/react';
import { defineAbilityFor, type AppAbility } from '@/lib/permissions/ability';

const AbilityContext = createContext<AppAbility>(null!);
export const Can = createContextualCan(AbilityContext.Consumer);

export function useAbility() {
  return useContext(AbilityContext);
}

interface AbilityProviderProps {
  children: React.ReactNode;
  user: {
    userId: string;
    clubId: string;
    roles: string[];
    linkedAthleteIds?: string[];
  };
}

export function AbilityProvider({ children, user }: AbilityProviderProps) {
  const [ability] = useState(() => defineAbilityFor(user));

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
```

### Pattern 3: Prisma accessibleBy for Query Filtering

```typescript
// In API route or server action
import { accessibleBy } from '@casl/prisma';
import { defineAbilityFor } from '@/lib/permissions/ability';

async function getPractices(userContext: UserContext) {
  const ability = defineAbilityFor(userContext);

  try {
    const practices = await prisma.practice.findMany({
      where: {
        AND: [
          accessibleBy(ability).Practice,
          { seasonId: currentSeasonId }, // Business logic
        ]
      }
    });
    return practices;
  } catch (error) {
    if (error.name === 'ForbiddenError') {
      return []; // User has no access to any practices
    }
    throw error;
  }
}
```

### Pattern 4: Multi-Club Context with Cookie Persistence

```typescript
// src/lib/auth/club-context.ts
import { cookies } from 'next/headers';

const CLUB_COOKIE_NAME = 'rowops_current_club';
const CLUB_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function getCurrentClubId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CLUB_COOKIE_NAME)?.value ?? null;
}

export async function setCurrentClubId(clubId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CLUB_COOKIE_NAME, clubId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLUB_COOKIE_MAX_AGE,
    path: '/',
  });
}

// API route for switching clubs
// POST /api/clubs/switch
export async function POST(request: NextRequest) {
  const { clubId } = await request.json();

  // Verify user has membership in target club
  const membership = await prisma.clubMembership.findFirst({
    where: { userId: user.id, clubId },
  });

  if (!membership) {
    return forbiddenResponse('Not a member of this club');
  }

  await setCurrentClubId(clubId);
  return NextResponse.json({ success: true });
}
```

### Anti-Patterns to Avoid

- **Role inheritance assumption:** Higher role does NOT get lower role permissions automatically
- **Global ability instance:** Create fresh ability per request with user context
- **Trusting JWT alone for club context:** Use cookie + verify membership in DB
- **accessibleBy without try/catch:** Throws ForbiddenError when no access, must handle
- **Checking permissions client-side only:** Always verify server-side, client is for UX

## Audit Logging Design

### Audit Log Schema

```prisma
// Addition to schema.prisma
model AuditLog {
  id          String   @id @default(uuid())
  clubId      String   // Tenant scoping
  userId      String   // Who performed action
  action      String   // e.g., 'ROLE_CHANGE', 'TEAM_DELETE', 'EXPORT_DATA'
  targetType  String   // e.g., 'TeamMember', 'Practice', 'Equipment'
  targetId    String?  // ID of affected record
  metadata    Json     // Action-specific details
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([clubId])
  @@index([userId])
  @@index([createdAt])
  @@index([clubId, createdAt])
  @@index([action])
}

// Enum for auditable actions (for type safety)
// Defined in application code, not Prisma enum (more flexible)
```

### Auditable Actions (~10 types per CONTEXT.md decision)

```typescript
// src/lib/audit/actions.ts
export const AUDITABLE_ACTIONS = {
  // Role management
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REMOVED: 'ROLE_REMOVED',
  ROLE_CHANGED: 'ROLE_CHANGED',

  // Membership
  MEMBER_INVITED: 'MEMBER_INVITED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_JOINED: 'MEMBER_JOINED',

  // Deletion
  TEAM_DELETED: 'TEAM_DELETED',
  PRACTICE_DELETED: 'PRACTICE_DELETED',
  EQUIPMENT_DELETED: 'EQUIPMENT_DELETED',

  // Export/Data access
  DATA_EXPORTED: 'DATA_EXPORTED',

  // Auth events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
} as const;
```

### Audit Logger Implementation

```typescript
// src/lib/audit/logger.ts
import { prisma } from '@/lib/prisma';
import { AUDITABLE_ACTIONS } from './actions';

type AuditAction = keyof typeof AUDITABLE_ACTIONS;

interface AuditContext {
  clubId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditEntry {
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(
  context: AuditContext,
  entry: AuditEntry
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      clubId: context.clubId,
      userId: context.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata ?? {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
  });
}

// Convenience wrapper for API routes
export function createAuditLogger(request: Request, context: AuditContext) {
  return {
    log: (entry: AuditEntry) => logAuditEvent({
      ...context,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    }, entry),
  };
}
```

### 365-Day Retention

Implement via scheduled job (Vercel Cron or similar):

```typescript
// src/app/api/cron/audit-cleanup/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);

  const deleted = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return NextResponse.json({ deleted: deleted.count });
}
```

## API Key Implementation

### API Key Schema

```prisma
model ApiKey {
  id           String    @id @default(uuid())
  clubId       String
  name         String    // User-friendly name
  keyPrefix    String    // First 8 chars of key (for identification)
  keyHash      String    // SHA-256 hash of full key
  createdBy    String    // userId who created
  permissions  Json      // Scoped permissions (future-proofing)
  lastUsedAt   DateTime?
  expiresAt    DateTime? // Optional expiration
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())

  @@unique([keyHash])
  @@index([clubId])
  @@index([keyPrefix])
  @@index([createdBy])
}
```

### API Key Generation & Storage

```typescript
// src/lib/auth/api-key.ts
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';

const KEY_PREFIX = 'sk_'; // Secret key prefix (Stripe pattern)
const KEY_LENGTH = 32; // Total length after prefix

interface CreateApiKeyResult {
  id: string;
  key: string; // Only returned once at creation
  keyPrefix: string;
}

export async function createApiKey(
  clubId: string,
  name: string,
  createdBy: string,
  expiresAt?: Date
): Promise<CreateApiKeyResult> {
  // Generate secure random key
  const randomPart = nanoid(KEY_LENGTH);
  const fullKey = `${KEY_PREFIX}${randomPart}`;
  const keyPrefix = fullKey.substring(0, 8);

  // Hash for storage (never store raw key)
  const keyHash = crypto
    .createHash('sha256')
    .update(fullKey)
    .digest('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      clubId,
      name,
      keyPrefix,
      keyHash,
      createdBy,
      permissions: {}, // Full access per CONTEXT.md decision
      expiresAt,
    },
  });

  return {
    id: apiKey.id,
    key: fullKey, // Only returned once!
    keyPrefix,
  };
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  clubId?: string;
  userId?: string; // Creator's userId for permission inheritance
}> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  const keyHash = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      clubId: true,
      createdBy: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!apiKey) {
    return { valid: false };
  }

  if (apiKey.revokedAt) {
    return { valid: false };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false };
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {}); // Non-blocking

  return {
    valid: true,
    clubId: apiKey.clubId,
    userId: apiKey.createdBy,
  };
}

// Timing-safe comparison for hash validation
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
```

### Middleware API Key Validation

```typescript
// Updated src/middleware.ts
import { validateApiKey } from '@/lib/auth/api-key';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API Key auth for /api/* routes (excluding auth routes)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const authHeader = request.headers.get('authorization');

    if (authHeader?.startsWith('Bearer sk_')) {
      const key = authHeader.substring(7); // Remove 'Bearer '
      const result = await validateApiKey(key);

      if (result.valid) {
        // Pass club context via headers to downstream handlers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-api-key-club-id', result.clubId!);
        requestHeaders.set('x-api-key-user-id', result.userId!);

        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      }

      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }
  }

  // ... existing Supabase session auth
}
```

## Multi-Club Context Implementation

### Club Membership Schema Update

```prisma
// Replaces single TeamMember for multi-club support
model ClubMembership {
  id        String   @id @default(uuid())
  clubId    String   // References Team.id (club = team in v2.0)
  userId    String
  roles     Role[]   // Array of roles (can be COACH + ATHLETE)
  isActive  Boolean  @default(true)
  joinedAt  DateTime @default(now())

  club Team @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([clubId, userId])
  @@index([userId])
  @@index([clubId])
}

// Role enum expanded
enum Role {
  FACILITY_ADMIN
  CLUB_ADMIN
  COACH
  ATHLETE
  PARENT
}
```

### Club Switcher Component

```typescript
// src/components/layout/club-switcher.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Club {
  id: string;
  name: string;
  roles: string[];
}

interface ClubSwitcherProps {
  clubs: Club[];
  currentClubId: string;
}

export function ClubSwitcher({ clubs, currentClubId }: ClubSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const currentClub = clubs.find(c => c.id === currentClubId);

  async function handleSwitch(clubId: string) {
    if (clubId === currentClubId) return;

    const response = await fetch('/api/clubs/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId }),
    });

    if (response.ok) {
      router.refresh(); // Refresh all server components
      setIsOpen(false);
    }
  }

  if (clubs.length === 1) {
    // Single club - just show name, no dropdown
    return <span className="font-medium">{currentClub?.name}</span>;
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        {currentClub?.name}
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="absolute dropdown-menu">
          {clubs.map(club => (
            <button
              key={club.id}
              onClick={() => handleSwitch(club.id)}
              className={club.id === currentClubId ? 'active' : ''}
            >
              <span>{club.name}</span>
              <span className="text-xs text-muted">
                {club.roles.join(', ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Session Data Flow

1. **Login**: Query all ClubMemberships for user
2. **Club Selection**: Store current club in httpOnly cookie
3. **Page Load**: Read cookie, verify membership, load CASL ability
4. **Switch Club**: Update cookie, router.refresh() reloads all data
5. **API Calls**: Include clubId from cookie/context in all queries

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission checking | Custom role === checks | @casl/ability | Handles complex conditions, field-level, isomorphic |
| Query filtering by permission | Manual WHERE clauses | @casl/prisma accessibleBy | Type-safe, consistent with ability definitions |
| API key hashing | MD5, bcrypt | SHA-256 (crypto.createHash) | Fast for lookup (not password), timing-safe comparison |
| Session cookie management | Manual cookie strings | next/headers cookies() | Handles httpOnly, secure, sameSite properly |
| Audit log schema | Multiple history tables | Single AuditLog with JSONB | Simpler, flexible, easier retention policy |

**Key insight:** CASL provides both the ability definition AND the query filtering, ensuring permissions are consistent between "can user do X?" and "show user everything they can do."

## Common Pitfalls

### Pitfall 1: Role Inheritance Assumption
**What goes wrong:** Assuming FACILITY_ADMIN can create lineups because they're "higher" than COACH
**Why it happens:** Traditional RBAC often uses inheritance
**How to avoid:** Per CONTEXT.md decision - explicit role composition only. User needs COACH role to create lineups, period.
**Warning signs:** "But they're an admin, why can't they..."

### Pitfall 2: accessibleBy Throws ForbiddenError
**What goes wrong:** Unhandled exception crashes API route
**Why it happens:** When user has NO access to a resource type, accessibleBy throws
**How to avoid:** Always wrap in try/catch, return empty array on ForbiddenError
**Warning signs:** 500 errors for users with restricted permissions

### Pitfall 3: Stale Club Context After Switch
**What goes wrong:** User switches clubs but sees old data
**Why it happens:** Client-side cache not invalidated
**How to avoid:** router.refresh() after club switch to refetch all server components; React Query invalidation for client data
**Warning signs:** Lineups from previous club appearing after switch

### Pitfall 4: API Key in JWT
**What goes wrong:** Trying to embed API key permissions in JWT claims
**Why it happens:** Assuming API keys work like user sessions
**How to avoid:** API keys bypass JWT entirely - validate hash in middleware, look up creator's permissions fresh
**Warning signs:** "How do I refresh the JWT for API key auth?"

### Pitfall 5: Audit Log Metadata Explosion
**What goes wrong:** Storing entire before/after objects in metadata bloats database
**Why it happens:** Over-engineering audit requirements
**How to avoid:** Per CONTEXT.md - security-critical actions only (~10 types), minimal metadata
**Warning signs:** Audit table growing faster than actual data tables

### Pitfall 6: Timing Attacks on API Key Validation
**What goes wrong:** Attacker can guess API key character-by-character
**Why it happens:** String comparison short-circuits on first mismatch
**How to avoid:** Use crypto.timingSafeEqual() for hash comparison
**Warning signs:** Using === for hash comparison

## Code Examples

### Protecting an API Route with CASL

```typescript
// src/app/api/practices/route.ts
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { getCurrentClubId } from '@/lib/auth/club-context';
import { defineAbilityFor } from '@/lib/permissions/ability';
import { accessibleBy, subject } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';

export async function GET(request: NextRequest) {
  const { user, claims, error } = await getClaimsForApiRoute();
  if (error) return unauthorizedResponse();

  const clubId = await getCurrentClubId();
  if (!clubId) return forbiddenResponse('No club selected');

  // Get user's roles in this club
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: user.id } },
  });

  if (!membership) return forbiddenResponse('Not a member of this club');

  const ability = defineAbilityFor({
    userId: user.id,
    clubId,
    roles: membership.roles,
  });

  try {
    const practices = await prisma.practice.findMany({
      where: accessibleBy(ability).Practice,
      include: { blocks: true },
    });
    return NextResponse.json(practices);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json([]); // No access = empty list
    }
    throw e;
  }
}

export async function POST(request: NextRequest) {
  // ... auth setup same as above

  const ability = defineAbilityFor({ userId, clubId, roles });

  // Check permission before action
  if (!ability.can('create', 'Practice')) {
    return forbiddenResponse('Cannot create practices');
  }

  const data = await request.json();

  // Create and audit
  const practice = await prisma.practice.create({ data });

  // Audit if this is a sensitive operation (deletion would be audited)
  // Note: creation is not in our ~10 auditable actions

  return NextResponse.json(practice, { status: 201 });
}
```

### Using Can Component in React

```typescript
// src/app/(dashboard)/practices/page.tsx
import { Can } from '@/components/permissions/can';

export default function PracticesPage() {
  return (
    <div>
      <h1>Practices</h1>

      <Can I="create" a="Practice">
        <Button href="/practices/new">Create Practice</Button>
      </Can>

      <Can I="create" a="Practice" passThrough>
        {(allowed) => (
          <Button disabled={!allowed} href="/practices/new">
            Create Practice
          </Button>
        )}
      </Can>

      <PracticeList />
    </div>
  );
}
```

### Audit Logging on Role Change

```typescript
// src/app/api/members/[id]/role/route.ts
export async function PATCH(request: NextRequest, { params }) {
  const { user, clubId, ability } = await getAuthContext(request);

  if (!ability.can('assign-role', subject('Team', { id: clubId }))) {
    return forbiddenResponse('Cannot assign roles');
  }

  const { roles } = await request.json();
  const targetUserId = params.id;

  const oldMembership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: targetUserId } },
  });

  const updated = await prisma.clubMembership.update({
    where: { clubId_userId: { clubId, userId: targetUserId } },
    data: { roles },
  });

  // Audit the role change
  await logAuditEvent(
    { clubId, userId: user.id },
    {
      action: 'ROLE_CHANGED',
      targetType: 'ClubMembership',
      targetId: updated.id,
      metadata: {
        targetUserId,
        oldRoles: oldMembership?.roles,
        newRoles: roles,
      },
    }
  );

  return NextResponse.json(updated);
}
```

## Implementation Sequence

Recommended order for Phase 10 tasks:

1. **Schema Migration** - Add Role enum values, ClubMembership, AuditLog, ApiKey tables
2. **Data Migration** - Convert existing TeamMember to ClubMembership (backward compatible)
3. **CASL Setup** - Install packages, create ability factory, subjects/actions
4. **Auth Context Extension** - Multi-club support in claims, club cookie management
5. **Ability Provider** - React context, Can component binding
6. **API Route Updates** - Replace role checks with CASL abilities
7. **Audit Logger** - Create logger, instrument security-critical operations
8. **API Key Management** - Create/revoke/list endpoints, middleware validation
9. **Club Switcher UI** - Header component, switch API
10. **Audit Log UI** - Admin view with filters, CSV export

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CASL accessibleBy transaction limitation | Cannot use with $transaction | Avoid explicit transactions where possible; use Prisma extension if needed |
| JWT claims not updated on role change | User has stale permissions | Database fallback already exists; add club context refresh on switch |
| Audit log storage growth | Database bloat | ~10 action types only + 365-day retention cleanup job |
| API key exposure | Security breach | Hash storage, show key only once at creation, rotation recommendation |
| Multi-club performance | Slow queries | Proper indexes on ClubMembership, cache user's clubs |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma middleware for extensions | Prisma Client Extensions | Prisma 4.16+ | Type-safe, composable extensions |
| Single role per user per team | Multiple roles per membership | This phase | Explicit composition for audit clarity |
| In-memory session context | Cookie + DB verification | Best practice | Survives server restarts, multi-instance safe |

**Deprecated/outdated:**
- Prisma middleware for query interception: Use Client Extensions instead
- Next.js middleware for auth: Now called "proxy", auth should use Data Access Layer

## Open Questions

1. **Invitation Model Migration**
   - What we know: Current Invitation model has single role field
   - What's unclear: Should invitations specify multiple roles upfront?
   - Recommendation: Allow single role on invite, user can be granted additional roles after joining

2. **Parent-Athlete Linking Table**
   - What we know: Parents need to see specific athletes' data
   - What's unclear: Should this be a separate table or JSON field?
   - Recommendation: Separate `ParentAthleteLink` table for clear audit trail

3. **Facility vs Club Relationship**
   - What we know: FACILITY_ADMIN manages multiple clubs
   - What's unclear: Is there an explicit Facility entity or just implied?
   - Recommendation: Start without Facility table, FACILITY_ADMIN role grants cross-club access within same deployment

## Sources

### Primary (HIGH confidence)
- [CASL Prisma Official Documentation](https://casl.js.org/v6/en/package/casl-prisma/)
- [CASL React GitHub](https://github.com/stalniy/casl/tree/master/packages/casl-react)
- [Prisma Client Extensions Documentation](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions)
- [Prisma Audit Log Context Extension](https://github.com/prisma/prisma-client-extensions/tree/main/audit-log-context)

### Secondary (MEDIUM confidence)
- [NestJS CASL Prisma Integration Guide](https://blog.devgenius.io/mastering-complex-rbac-in-nestjs-integrating-casl-with-prisma-orm-for-granular-authorization-767941a05ef1)
- [Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [API Key Patterns (Stripe-style prefixes)](https://generate-random.org/api-keys)

### Tertiary (LOW confidence)
- Various Medium articles on audit logging patterns
- Community discussions on CASL GitHub issues

## Metadata

**Confidence breakdown:**
- CASL integration: HIGH - Official documentation, widely used
- Audit logging pattern: MEDIUM - Based on Prisma examples, not industry standard
- API key pattern: HIGH - Follows established Stripe pattern
- Multi-club session: MEDIUM - Custom implementation based on best practices
- Schema design: HIGH - Follows existing codebase patterns

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable domain)
