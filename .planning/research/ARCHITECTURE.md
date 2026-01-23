# Architecture Research: v2.0 Commercial Readiness

**Domain:** Multi-tenant SaaS for rowing team operations
**Researched:** 2026-01-22
**Overall confidence:** HIGH

## Executive Summary

RowOps v2.0 introduces four major architectural enhancements to an existing Next.js 16 + Prisma 6 + Supabase application: facility-level multi-tenancy, mobile-first PWA improvements, design system integration, and RBAC hardening. The current architecture uses application-level tenant filtering with JWT claims (team_id), Serwist service workers with Dexie.js IndexedDB for offline capabilities, and server-side multi-tenant data isolation.

**Key architectural decisions:**
1. **Facility Model**: Extend JWT claims to support hierarchical tenancy (facility_id, club_id, team_id) while maintaining backward compatibility with existing team-only architecture
2. **Mobile PWA**: Enhance existing Serwist/Dexie setup with mobile-first responsive components, 44px touch targets, and improved offline sync patterns
3. **UI/UX**: Adopt Shadcn/UI with CVA (Class Variance Authority) for consistent, accessible component variants on top of existing Tailwind CSS
4. **RBAC**: Implement Supabase custom claims via Auth Hooks for hierarchical permissions (Facility Admin → Coach → Athlete → Parent) with Prisma Client Extensions for automatic tenant filtering

## Current Architecture Summary

### Technology Stack
- **Framework**: Next.js 16 App Router with React 19
- **Database**: PostgreSQL (Supabase) with Prisma 6 ORM
- **Authentication**: Supabase Auth with JWT claims (team_id, user_role)
- **Offline**: Serwist 9 service worker + Dexie.js 4 IndexedDB
- **UI**: Tailwind CSS 4 with Lucide icons, dnd-kit for drag-drop
- **State**: React Hook Form + Zod validation, Sonner toasts

### Current Multi-Tenancy Model
- **Pattern**: Shared database with application-level tenant filtering
- **Isolation**: Every table has `teamId` field, enforced in middleware and queries
- **Claims**: JWT contains `team_id` and `user_role` (COACH, ATHLETE, PARENT)
- **Verification**: `getUser()` validates JWT, database fallback for stale claims
- **Queries**: Manual `where: { teamId }` filtering in Prisma queries

### Current Data Model (Simplified)
```
Team (current tenant root)
├── TeamMember (userId + role)
├── Season
│   ├── Practice → PracticeBlock → Lineup
│   └── Regatta → Entry → EntryLineup
├── Equipment (shells, oars, launches)
└── AthleteProfile
```

### Current Authentication Flow
1. User authenticates via Supabase Auth
2. Middleware calls `getUser()` to verify JWT authenticity
3. API routes use `getClaimsForApiRoute()` to extract team_id from JWT
4. Database fallback queries TeamMember if JWT claims are stale
5. All Prisma queries manually filter by teamId

### Current Offline Architecture
- **Service Worker**: Serwist 9 with precaching and runtime caching strategies
- **Local Storage**: Dexie.js IndexedDB for practices, lineups, equipment, regattas
- **Sync Pattern**: Read from IndexedDB first, write to server when online
- **Background Sync**: Service worker queues mutations when offline
- **Push Notifications**: Web Push for race alerts and lineup changes

## Facility Model Integration

### Problem Statement
Current architecture assumes Team is the tenant root. Real-world rowing organizations have facilities (boathouses) hosting multiple clubs, with equipment shared at facility-level or exclusive to clubs. Example: Chattanooga Rowing (facility) hosts Lookout Rowing Club and Chattanooga Juniors Rowing, sharing some boats but each club having exclusive equipment.

### Recommended Schema Evolution

#### New Hierarchy
```
Facility (boathouse/foundation)
├── Club (paying subscriber, has teams)
│   ├── Team (organizational unit within club)
│   │   ├── Season → Practice → etc.
│   │   └── TeamMember
│   └── Equipment (club-exclusive)
└── Equipment (facility-shared)
```

#### Database Schema Changes

**Phase 1: Add Facility and Club models** (backward compatible)
```prisma
model Facility {
  id        String   @id @default(uuid())
  name      String   // e.g., "Chattanooga Rowing"
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  clubs      Club[]
  equipment  Equipment[] // Facility-owned shared equipment
}

model Club {
  id         String   @id @default(uuid())
  facilityId String
  name       String   // e.g., "Lookout Rowing Club"
  slug       String   @unique
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  facility   Facility @relation(fields: [facilityId], references: [id])
  teams      Team[]
  equipment  Equipment[] // Club-exclusive equipment

  @@index([facilityId])
}

// Extend existing Team model
model Team {
  id      String  @id @default(uuid())
  clubId  String? // Nullable for backward compatibility
  // ... existing fields ...

  club    Club?   @relation(fields: [clubId], references: [id])
  // ... existing relations ...

  @@index([clubId])
}

// Extend existing Equipment model
model Equipment {
  id         String  @id @default(uuid())
  teamId     String? // Null if facility/club-owned
  clubId     String? // Null if facility-owned
  facilityId String? // Null if team/club-owned
  ownerType  EquipmentOwnerType // FACILITY | CLUB | TEAM
  // ... existing fields ...

  team       Team?     @relation(fields: [teamId], references: [id])
  club       Club?     @relation(fields: [clubId], references: [id])
  facility   Facility? @relation(fields: [facilityId], references: [id])

  @@index([facilityId])
  @@index([clubId])
  @@index([teamId])
}

enum EquipmentOwnerType {
  FACILITY // Shared across all clubs at facility
  CLUB     // Exclusive to club, shared across teams
  TEAM     // Exclusive to team (existing behavior)
}
```

**Rationale:**
- Nullable foreign keys allow gradual migration from team-only to facility hierarchy
- EquipmentOwnerType explicitly models ownership level
- Existing team-only installations continue working (clubId, facilityId = null)

### JWT Claims Changes

#### Extended Claims Structure
```typescript
export interface CustomJwtPayload {
  sub: string;
  email: string;
  // Hierarchical tenant identifiers
  facility_id: string | null;
  club_id: string | null;
  team_id: string | null;
  // User role with facility admin addition
  user_role: 'FACILITY_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT' | null;
  // Active context for multi-team users
  active_team_id: string | null;
}
```

**Implementation via Supabase Auth Hooks:**
- Use Custom Access Token Hook to populate facility_id, club_id, team_id from TeamMember → Team → Club → Facility
- Hook queries database on token issuance/refresh
- Claims stored in JWT, available to RLS policies via `current_setting('request.jwt.claims', true)`

**Source:** [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac), [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)

### Query Pattern Changes

#### Current Pattern (manual filtering)
```typescript
const practices = await prisma.practice.findMany({
  where: { teamId: claims.team_id }
});
```

#### Recommended Pattern (Prisma Client Extensions with automatic filtering)
```typescript
// Extend Prisma client with automatic tenant filtering
const createTenantClient = (claims: CustomJwtPayload) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          // Automatically inject tenant filters based on model
          args.where = { ...args.where, teamId: claims.team_id };
          return query(args);
        },
        // Similar for findFirst, update, delete, etc.
      },
    },
  });
};
```

**Benefits:**
- Automatic tenant filtering prevents accidental data leaks
- Type-safe with full TypeScript support
- Centralized tenant logic reduces query boilerplate

**Source:** [Prisma Client Extensions](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn), [Multi-tenant Prisma patterns](https://zenstack.dev/blog/multi-tenant)

### Migration Strategy

#### Phase 1: Schema Extension (backward compatible)
1. Add Facility, Club models with nullable relationships
2. Keep existing Team-based queries working
3. Add equipment ownership type field

#### Phase 2: Data Migration
```sql
-- Create default facility for existing teams
INSERT INTO "Facility" (id, name, slug)
SELECT
  uuid_generate_v4(),
  'Default Facility',
  'default-facility'
WHERE NOT EXISTS (SELECT 1 FROM "Facility");

-- Create default club per team
INSERT INTO "Club" (id, "facilityId", name, slug)
SELECT
  uuid_generate_v4(),
  (SELECT id FROM "Facility" WHERE slug = 'default-facility'),
  t.name || ' Club',
  t.slug || '-club'
FROM "Team" t
WHERE t."clubId" IS NULL;

-- Link existing teams to clubs
UPDATE "Team" t
SET "clubId" = c.id
FROM "Club" c
WHERE c.slug = t.slug || '-club'
  AND t."clubId" IS NULL;

-- Mark existing equipment as team-owned
UPDATE "Equipment"
SET
  "ownerType" = 'TEAM'
WHERE "ownerType" IS NULL;
```

#### Phase 3: Auth Hook Implementation
1. Create Supabase Edge Function for Custom Access Token Hook
2. Query TeamMember → Team → Club → Facility on token issuance
3. Populate facility_id, club_id, team_id in JWT claims
4. Update getClaimsForApiRoute() to handle new claims structure

#### Phase 4: Query Refactoring
1. Implement Prisma Client Extension for automatic filtering
2. Refactor equipment queries to respect ownerType hierarchy
3. Update authorization helpers to check facility/club/team access

## Mobile PWA Integration

### Current State
- Serwist 9 service worker with precaching
- Dexie.js IndexedDB for offline data
- Basic responsive layout with Tailwind CSS
- dnd-kit for drag-and-drop lineups

### Mobile-First Architecture Enhancements

#### 1. Responsive Design System

**Implement Breakpoint-First Component Variants**
```typescript
// Use CVA for mobile-first responsive variants
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "rounded font-medium transition-colors",
  {
    variants: {
      size: {
        sm: "h-9 px-3 text-sm",      // Mobile default
        md: "h-10 px-4 text-base",   // Tablet
        lg: "h-11 px-8 text-lg",     // Desktop
      },
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
      },
    },
    defaultVariants: {
      size: "sm",
      variant: "primary",
    },
  }
);
```

**Touch Target Standards:**
- Minimum 44x44px touch targets (WCAG 2.1 AAA, iOS HIG)
- Minimum 48x48dp on Android (Material Design)
- 11mm (42px) targets at screen top, 12mm (46px) at screen bottom (rage tap prevention)
- Minimum 8px spacing between interactive elements

**Source:** [Accessible Touch Target Sizes](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/), [LogRocket Touch Targets Guide](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/)

#### 2. Touch-Optimized Drag & Drop

**Current dnd-kit Configuration Issues:**
```typescript
// Problem: Default pointer sensor doesn't work well on mobile
<DndContext sensors={sensors}>
```

**Recommended Mobile-Optimized Configuration:**
```typescript
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Prevent accidental drags
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,      // Long-press to activate (ms)
      tolerance: 5,    // Movement tolerance (px)
    },
  })
);

// Apply touch-action CSS to draggables
<div style={{ touchAction: 'manipulation' }}>
  <Draggable id={athlete.id} />
</div>
```

**Key Improvements:**
- Touch sensor with delay prevents accidental drag on scroll
- `touch-action: manipulation` prevents browser zoom gestures
- Distance constraint prevents rage taps

**Source:** [dnd-kit Touch Sensor Docs](https://docs.dndkit.com/api-documentation/sensors/touch), [dnd-kit mobile issues](https://github.com/clauderic/dnd-kit/issues/435)

#### 3. Offline Sync Enhancements

**Current Pattern:** Basic IndexedDB caching with manual sync

**Recommended Pattern:** Queue-Store-Detect-Sync with Conflict Resolution
```typescript
// Sync queue in Dexie
class AppDatabase extends Dexie {
  practices!: Dexie.Table<Practice, string>;
  syncQueue!: Dexie.Table<SyncOperation, number>;

  constructor() {
    super('rowops');
    this.version(1).stores({
      practices: 'id, teamId, date',
      syncQueue: '++id, timestamp, retryCount', // Auto-increment ID
    });
  }
}

interface SyncOperation {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'practice' | 'lineup' | 'equipment';
  resourceId: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

// Queue mutations when offline
async function createPractice(data: PracticeInput) {
  const practice = { id: nanoid(), ...data };

  // Write to IndexedDB first (optimistic UI)
  await db.practices.add(practice);

  // Queue sync operation
  await db.syncQueue.add({
    type: 'CREATE',
    resource: 'practice',
    resourceId: practice.id,
    data: practice,
    timestamp: Date.now(),
    retryCount: 0,
  });

  // Attempt immediate sync if online
  if (navigator.onLine) {
    await processSyncQueue();
  }
}

// Background sync processing
async function processSyncQueue() {
  const operations = await db.syncQueue.orderBy('timestamp').toArray();

  for (const op of operations) {
    try {
      await fetch(`/api/${op.resource}`, {
        method: 'POST',
        body: JSON.stringify(op.data),
      });

      // Remove from queue on success
      await db.syncQueue.delete(op.id!);
    } catch (error) {
      // Increment retry count, exponential backoff
      await db.syncQueue.update(op.id!, {
        retryCount: op.retryCount + 1,
      });
    }
  }
}
```

**Sync Strategies:**
- **Immediate sync**: Attempt on mutation if online
- **Periodic sync**: Service worker triggers every 5 minutes when online
- **Manual sync**: User-triggered "Refresh" button
- **Conflict resolution**: Server timestamp wins, local changes merged if compatible

**Source:** [Dexie.js Sync Patterns](https://app.studyraid.com/en/read/11356/355148/synchronization-patterns), [Offline-First IndexedDB 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)

#### 4. Progressive Enhancement for Mobile

**Service Worker Strategy:**
```javascript
// sw.js - Enhanced Serwist configuration
import { Serwist } from 'serwist';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.rowops\.com\/practices/,
      handler: new NetworkFirst({
        cacheName: 'practices-cache',
        networkTimeoutSeconds: 3, // Fallback to cache after 3s
      }),
    },
    {
      urlPattern: /^https:\/\/api\.rowops\.com\/equipment/,
      handler: new StaleWhileRevalidate({
        cacheName: 'equipment-cache',
      }),
    },
    {
      urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif)$/,
      handler: new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
          {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
```

**Mobile Performance Optimizations:**
- Network timeout fallback (3s) for flaky cellular connections
- Image caching with LRU eviction (50 max entries)
- StaleWhileRevalidate for equipment (rarely changes, always shows stale data immediately)

**Source:** [Serwist API Documentation](https://serwist.pages.dev/docs/serwist/core), [Build Next.js 16 PWA with Offline Support](https://blog.logrocket.com/nextjs-16-pwa-offline-support)

## UI/UX Integration

### Design System Strategy

#### Recommended Approach: Shadcn/UI + CVA

**Why Shadcn/UI:**
- Copy-paste components (no runtime dependency, full ownership)
- Built on Radix UI (battle-tested accessibility, touch-friendly)
- Tailwind CSS integration (matches existing stack)
- CVA for type-safe variant management
- Responsive and mobile-first by default

**Architecture:**
```
src/
├── components/
│   ├── ui/              # Shadcn/UI primitives (copied, owned)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ... (30+ components)
│   ├── practice/        # Domain components (existing)
│   ├── lineup/
│   └── equipment/
├── lib/
│   └── utils.ts         # cn() helper for merging Tailwind classes
└── styles/
    └── globals.css      # Tailwind + Shadcn theme variables
```

**Installation:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button dialog dropdown-menu
```

**Theme Configuration (globals.css):**
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;      /* Rowing blue */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --accent: 210 40% 96.1%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    /* ... dark mode values ... */
  }
}
```

**Component Variant Example:**
```typescript
// components/ui/button.tsx (Shadcn-generated, then customized)
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-9 min-w-[44px] px-3 text-sm",     // 44px min for touch
        md: "h-10 min-w-[48px] px-4",            // 48px recommended
        lg: "h-11 min-w-[48px] px-8",
        icon: "h-10 w-10",                       // Square touch target
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

**Mobile-Specific Enhancements:**
- All interactive elements meet 44px minimum touch target
- `focus-visible` for keyboard navigation (accessibility)
- `disabled:pointer-events-none` prevents rage taps on disabled buttons
- Icon buttons are square (10x10 = 40px, meets minimum with padding)

**Source:** [Shadcn/UI Docs](https://ui.shadcn.com/), [CVA Documentation](https://cva.style/docs), [Shadcn vs Radix comparison 2026](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25)

#### Migration Strategy

**Phase 1: Install Shadcn/UI Infrastructure**
1. Initialize Shadcn with `npx shadcn-ui@latest init`
2. Configure theme colors in globals.css
3. Add Button, Dialog, DropdownMenu primitives

**Phase 2: Refactor High-Traffic Components**
1. Replace custom buttons with Shadcn Button (practices, lineups)
2. Replace custom modals with Shadcn Dialog
3. Replace custom dropdowns with DropdownMenu

**Phase 3: Build Domain Component Library**
1. Create composite components (PracticeCard, LineupEditor)
2. Use Shadcn primitives as building blocks
3. Maintain domain logic separation

**Phase 4: Mobile Polish**
1. Audit all interactive elements for 44px touch targets
2. Add touch-action CSS to draggable elements
3. Test on physical devices (iOS Safari, Android Chrome)

#### Component Inventory (Recommended Shadcn Components)

| Shadcn Component | RowOps Use Case | Priority |
|------------------|-----------------|----------|
| Button | Primary actions (Save, Publish, Create) | High |
| Dialog | Practice editor, lineup assignment | High |
| DropdownMenu | Equipment actions, roster management | High |
| Calendar | Date picker for practices, regattas | High |
| Popover | Quick equipment details, athlete info | Medium |
| Sheet | Mobile navigation drawer | Medium |
| Tabs | Season view, regatta timeline | Medium |
| Alert | Offline warnings, damage reports | Medium |
| Badge | Equipment status, athlete eligibility | Low |
| Card | Practice list, equipment inventory | Low |

## Security/RBAC Integration

### Current Authorization Model

**Roles:**
```typescript
enum Role {
  COACH   // Full team control
  ATHLETE // View schedules, assignments
  PARENT  // Read-only, linked to athlete
}
```

**Limitations:**
- No facility-level admin role
- No club-level permissions
- No per-resource permissions (e.g., edit equipment but not lineups)
- Role checks scattered across codebase

### Recommended Hierarchical RBAC

#### 1. Extended Role Hierarchy

```typescript
enum Role {
  FACILITY_ADMIN // Manages facility equipment, oversees clubs
  CLUB_ADMIN     // Manages club subscription, club equipment
  COACH          // Manages team practices, lineups, roster
  ATHLETE        // Views own schedule, assignments
  PARENT         // Views child's schedule (read-only)
}

interface Permission {
  resource: 'equipment' | 'practice' | 'lineup' | 'roster' | 'regatta';
  action: 'create' | 'read' | 'update' | 'delete';
  scope: 'facility' | 'club' | 'team' | 'self';
}
```

**Hierarchical Inheritance:**
```
FACILITY_ADMIN
├── Full access to facility equipment
├── Read access to all club/team data
└── Inherits: CLUB_ADMIN permissions for all clubs

CLUB_ADMIN
├── Manages club equipment, subscription
├── Read access to all team data in club
└── Inherits: COACH permissions for all teams in club

COACH
├── Full access to team practices, lineups, roster
├── Read access to facility/club equipment
└── Inherits: ATHLETE permissions for visibility

ATHLETE
├── Read access to own schedule, assignments
└── Read access to team equipment

PARENT
└── Read access to child's schedule
```

**Source:** [RBAC Hierarchical Model](https://www.zluri.com/blog/role-based-access-control), [Distributed Permission Hierarchy](https://www.linkedin.com/pulse/distributed-levels-permission-hierarchy-rbac-rajesh-kumar)

#### 2. Supabase RLS Policies

**Equipment Access Policy Example:**
```sql
-- Facility admins can manage facility equipment
CREATE POLICY "facility_admin_equipment_access"
ON "Equipment"
FOR ALL
TO authenticated
USING (
  "facilityId" IN (
    SELECT f.id
    FROM "Facility" f
    JOIN "Club" c ON c."facilityId" = f.id
    JOIN "Team" t ON t."clubId" = c.id
    JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE tm."userId" = auth.uid()
      AND tm."role" = 'FACILITY_ADMIN'
  )
)
WITH CHECK (
  "facilityId" IN (
    SELECT f.id
    FROM "Facility" f
    JOIN "Club" c ON c."facilityId" = f.id
    JOIN "Team" t ON t."clubId" = c.id
    JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE tm."userId" = auth.uid()
      AND tm."role" = 'FACILITY_ADMIN'
  )
);

-- Club admins can manage club equipment
CREATE POLICY "club_admin_equipment_access"
ON "Equipment"
FOR ALL
TO authenticated
USING (
  "clubId" IN (
    SELECT c.id
    FROM "Club" c
    JOIN "Team" t ON t."clubId" = c.id
    JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE tm."userId" = auth.uid()
      AND tm."role" IN ('CLUB_ADMIN', 'FACILITY_ADMIN')
  )
)
WITH CHECK (
  "clubId" IN (
    SELECT c.id
    FROM "Club" c
    JOIN "Team" t ON t."clubId" = c.id
    JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE tm."userId" = auth.uid()
      AND tm."role" IN ('CLUB_ADMIN', 'FACILITY_ADMIN')
  )
);

-- Coaches can manage team equipment
CREATE POLICY "coach_equipment_access"
ON "Equipment"
FOR ALL
TO authenticated
USING (
  "teamId" IN (
    SELECT tm."teamId"
    FROM "TeamMember" tm
    WHERE tm."userId" = auth.uid()
      AND tm."role" IN ('COACH', 'CLUB_ADMIN', 'FACILITY_ADMIN')
  )
)
WITH CHECK (
  "teamId" IN (
    SELECT tm."teamId"
    FROM "TeamMember" tm
    WHERE tm."userId" = auth.uid()
      AND tm."role" IN ('COACH', 'CLUB_ADMIN', 'FACILITY_ADMIN')
  )
);

-- All team members can read equipment
CREATE POLICY "team_member_equipment_read"
ON "Equipment"
FOR SELECT
TO authenticated
USING (
  "teamId" IN (
    SELECT tm."teamId"
    FROM "TeamMember" tm
    WHERE tm."userId" = auth.uid()
  )
  OR "clubId" IN (
    SELECT t."clubId"
    FROM "Team" t
    JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE tm."userId" = auth.uid()
  )
  OR "facilityId" IN (
    SELECT c."facilityId"
    FROM "Club" c
    JOIN "Team" t ON t."clubId" = c.id
    JOIN "TeamMember" tm ON tm."teamId" = t.id
    WHERE tm."userId" = auth.uid()
  )
);
```

**Benefits of RLS:**
- Enforcement at database level (defense in depth)
- Automatic filtering when using Supabase client
- Prevents accidental data leaks even if application code has bugs

**Source:** [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase RBAC Guide](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)

#### 3. Middleware Authorization

**Current Middleware:**
- Only checks authentication (user logged in)
- No role-based route protection

**Recommended Middleware Pattern (Next.js 16):**
```typescript
// Note: Next.js 16 renames middleware.ts to proxy.ts
// src/proxy.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import type { CustomJwtPayload } from '@/lib/auth/claims';

// Role-based route protection
const roleRoutes = {
  '/facility': ['FACILITY_ADMIN'],
  '/club': ['FACILITY_ADMIN', 'CLUB_ADMIN'],
  '/team': ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH'],
  '/practices': ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE'],
  '/lineups': ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE'],
  '/equipment': ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE'],
};

export async function proxy(request: NextRequest) {
  // ... authentication logic (existing) ...

  const {
    data: { user, session },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login (existing logic)
  }

  // Decode JWT for role-based access control
  if (session) {
    const claims = jwtDecode<CustomJwtPayload>(session.access_token);
    const { pathname } = request.nextUrl;

    // Check role-based route protection
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!claims.user_role || !allowedRoles.includes(claims.user_role)) {
          const url = request.nextUrl.clone();
          url.pathname = '/unauthorized';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Migration Note:** Next.js 16 renames `middleware.ts` to `proxy.ts` and the exported function to `proxy`. Update existing code accordingly.

**Source:** [Next.js 16 Auth Guide](https://nextjs.org/docs/app/guides/authentication), [Next.js 16 Changes](https://auth0.com/blog/whats-new-nextjs-16/)

#### 4. Server Action Authorization

**Current Pattern:** No explicit authorization in Server Actions

**Recommended Pattern (Data Access Layer):**
```typescript
// lib/dal/equipment.ts - Data Access Layer
'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/authorize';

export async function createEquipment(data: EquipmentInput) {
  // Verify user has COACH or higher role
  const { claims } = await requireRole(['COACH', 'CLUB_ADMIN', 'FACILITY_ADMIN']);

  // Create equipment scoped to user's team/club/facility
  return prisma.equipment.create({
    data: {
      ...data,
      teamId: data.ownerType === 'TEAM' ? claims.team_id : null,
      clubId: data.ownerType === 'CLUB' ? claims.club_id : null,
      facilityId: data.ownerType === 'FACILITY' ? claims.facility_id : null,
    },
  });
}

export async function updateEquipment(id: string, data: EquipmentInput) {
  const { user, claims } = await requireRole(['COACH', 'CLUB_ADMIN', 'FACILITY_ADMIN']);

  // Verify user has access to this equipment
  const equipment = await prisma.equipment.findUnique({ where: { id } });
  if (!equipment) throw new Error('Equipment not found');

  const hasAccess =
    (equipment.ownerType === 'TEAM' && equipment.teamId === claims.team_id) ||
    (equipment.ownerType === 'CLUB' && equipment.clubId === claims.club_id) ||
    (equipment.ownerType === 'FACILITY' && equipment.facilityId === claims.facility_id);

  if (!hasAccess) throw new Error('Unauthorized');

  return prisma.equipment.update({ where: { id }, data });
}

export async function listEquipment() {
  const { claims } = await requireAuth();

  // Return equipment accessible to user's team/club/facility
  return prisma.equipment.findMany({
    where: {
      OR: [
        { teamId: claims.team_id },           // Team-owned
        { clubId: claims.club_id },           // Club-owned (shared across teams)
        { facilityId: claims.facility_id },   // Facility-owned (shared across clubs)
      ],
    },
  });
}
```

**Benefits:**
- Centralized authorization logic (Single Responsibility Principle)
- Server Actions perform their own auth checks (defense in depth)
- Type-safe with TypeScript
- Easier to audit and test

**Source:** [Next.js Auth Guide - DAL Pattern](https://nextjs.org/docs/app/guides/authentication), [Next.js RBAC Patterns](https://clerk.com/blog/nextjs-role-based-access-control)

## Build Order

### Recommended Phase Structure

#### Phase 1: Foundation (Security & Infrastructure)
**Goal:** Harden auth and prepare architecture for hierarchy

**Tasks:**
1. Rename middleware.ts to proxy.ts (Next.js 16 migration)
2. Implement Prisma Client Extensions for automatic tenant filtering
3. Add Data Access Layer (DAL) for Server Actions
4. Audit existing authorization gaps
5. Write integration tests for auth flows

**Rationale:** Security changes must come first. All subsequent features depend on hierarchical auth working correctly.

**Dependencies:** None (can start immediately)

---

#### Phase 2: Facility Model Schema
**Goal:** Add database schema for facility/club hierarchy

**Tasks:**
1. Add Facility, Club models to Prisma schema
2. Add nullable clubId to Team model
3. Add ownerType, facilityId, clubId to Equipment model
4. Generate and run Prisma migration
5. Create backward-compatible data migration (default facility/club)

**Rationale:** Schema changes are foundation for all facility features. Backward-compatible approach allows existing installations to continue working.

**Dependencies:** Phase 1 complete (need auth patterns stable)

---

#### Phase 3: Facility Auth Integration
**Goal:** Enable facility/club hierarchy in JWT claims

**Tasks:**
1. Create Supabase Custom Access Token Hook (Edge Function)
2. Update CustomJwtPayload interface (facility_id, club_id)
3. Update getClaimsForApiRoute() to handle hierarchy
4. Update requireRole() to support FACILITY_ADMIN, CLUB_ADMIN
5. Implement RLS policies for Equipment, Practice, etc.

**Rationale:** Auth must understand hierarchy before UI can use it.

**Dependencies:** Phase 2 complete (schema exists for hook to query)

---

#### Phase 4: Mobile PWA Improvements
**Goal:** Improve mobile experience and offline capabilities

**Tasks:**
1. Audit touch targets (minimum 44px)
2. Configure dnd-kit TouchSensor with activation constraints
3. Implement sync queue pattern in Dexie.js
4. Add conflict resolution for offline mutations
5. Test on physical iOS/Android devices

**Rationale:** Mobile improvements are independent of facility model. Can proceed in parallel with Phase 3.

**Dependencies:** Phase 1 complete (need stable auth), no facility dependency

---

#### Phase 5: Design System Integration
**Goal:** Add Shadcn/UI component library and CVA variants

**Tasks:**
1. Initialize Shadcn/UI (`npx shadcn-ui@latest init`)
2. Configure theme colors in globals.css
3. Add Button, Dialog, DropdownMenu components
4. Refactor high-traffic components (PracticeEditor, LineupEditor)
5. Build composite domain components using Shadcn primitives

**Rationale:** Design system changes are mostly visual. Can proceed in parallel with Phases 3-4.

**Dependencies:** None (can start anytime), but benefits from Phase 4 (touch target awareness)

---

#### Phase 6: Facility UI Features
**Goal:** Build facility/club management UI

**Tasks:**
1. Create facility admin dashboard
2. Build club management interface
3. Add equipment ownership selector (FACILITY / CLUB / TEAM)
4. Update equipment list to show owner badges
5. Add "Switch Team" dropdown for multi-team users

**Rationale:** UI features require all foundation work complete.

**Dependencies:** Phases 2, 3, 5 complete (schema, auth, design system ready)

---

#### Phase 7: Integration Testing & Polish
**Goal:** Test end-to-end scenarios and fix gaps

**Tasks:**
1. Test multi-facility scenario (Chattanooga Rowing example)
2. Test offline sync queue with conflicts
3. Test role-based access control for all roles
4. Audit accessibility (WCAG 2.1 AAA touch targets)
5. Performance testing on mobile devices

**Rationale:** Integration testing ensures all pieces work together correctly.

**Dependencies:** All phases complete

---

### Parallel Execution Opportunities

**Can run in parallel:**
- Phase 4 (Mobile PWA) + Phase 3 (Facility Auth) — independent concerns
- Phase 5 (Design System) + Phase 3/4 — visual changes, no auth/data dependency

**Must be sequential:**
- Phase 1 → Phase 2 → Phase 3 → Phase 6 (facility model chain)
- Phase 2 → Phase 6 (UI needs schema)
- Phase 3 → Phase 6 (UI needs auth)

### Critical Path
1. Phase 1 (Security foundation) — **blocking all work**
2. Phase 2 (Schema) — **blocking facility features**
3. Phase 3 (Facility auth) — **blocking facility UI**
4. Phase 6 (Facility UI) — **final delivery**

Estimated timeline: 6-8 weeks with parallel work on Phases 4-5.

## Integration Points with Existing Components

### High-Impact Refactors

#### 1. Equipment Component
**Current:** Single equipment list, team-scoped

**New:**
- Badge showing owner (FACILITY / CLUB / TEAM)
- Filter by owner type
- Facility/club admins see all equipment
- Team members see team + club + facility equipment

**Changes:**
- Update EquipmentList query to include hierarchy
- Add OwnerBadge component
- Update EquipmentForm with ownerType selector

---

#### 2. Practice/Lineup Editor
**Current:** Manual drag-drop, desktop-optimized

**New:**
- Touch-friendly drag handles (44px minimum)
- Long-press activation (250ms delay)
- Responsive layout (stacked on mobile, side-by-side on desktop)
- Equipment picker shows facility/club/team equipment

**Changes:**
- Add TouchSensor to dnd-kit
- Update drag handle size (min 44px)
- Refactor layout with Shadcn Sheet for mobile drawer

---

#### 3. Navigation
**Current:** Single team context

**New:**
- Multi-team dropdown if user belongs to multiple teams
- Facility admin sees all clubs/teams
- Role badge in header (FACILITY_ADMIN / COACH / etc.)

**Changes:**
- Add TeamSwitcher component (Shadcn DropdownMenu)
- Update navigation guards for role-based routes
- Add facility/club navigation for admins

---

#### 4. Offline Sync
**Current:** Basic IndexedDB caching

**New:**
- Sync queue for mutations
- Conflict resolution (server timestamp wins)
- Retry with exponential backoff
- User-visible sync status indicator

**Changes:**
- Add syncQueue table in Dexie
- Update mutation hooks to queue operations
- Add SyncStatusBadge component (online/offline/syncing)

## Data Flow Changes

### Current Flow (Team-Only)
```
User → Supabase Auth → JWT (team_id) → Middleware →
API Route → Prisma (where: { teamId }) → PostgreSQL
```

### New Flow (Hierarchical)
```
User → Supabase Auth →
Custom Access Token Hook (queries Facility/Club/Team) →
JWT (facility_id, club_id, team_id, user_role) →
Proxy (role-based route protection) →
API Route → Prisma Client Extension (automatic filtering) →
RLS Policies (defense in depth) → PostgreSQL
```

**Key Changes:**
1. **Auth Hook** populates hierarchical claims
2. **Proxy** (renamed from middleware) checks role-based routes
3. **Prisma Extension** automatically filters by tenant
4. **RLS Policies** provide database-level enforcement

## Migration Risks & Mitigations

### Risk 1: Breaking Existing Installations
**Impact:** High — existing team-only users can't access app

**Mitigation:**
- Nullable foreign keys (clubId, facilityId)
- Default facility/club migration for existing teams
- Feature flag for facility features (off by default)
- Backward-compatible JWT claims (team_id still works)

---

### Risk 2: Offline Sync Conflicts
**Impact:** Medium — users lose data if conflict resolution fails

**Mitigation:**
- Server timestamp always wins (simple, predictable)
- Local changes merged if compatible (e.g., different fields)
- Conflict log table for manual resolution
- User notification on conflict (toast message)

---

### Risk 3: Performance with RLS Policies
**Impact:** Medium — complex RLS queries may slow down API

**Mitigation:**
- Index all foreign keys (facilityId, clubId, teamId)
- Use Prisma Client Extension for application-level filtering (faster than RLS)
- Enable RLS as defense-in-depth, not primary filter
- Monitor query performance with pg_stat_statements

---

### Risk 4: Mobile Touch UX Regressions
**Impact:** Low-Medium — drag-drop breaks on mobile

**Mitigation:**
- Test on physical devices (iOS Safari, Android Chrome)
- Use TouchSensor with delay (250ms) to prevent accidental drags
- Add touch-action: manipulation CSS
- Fallback to click-to-assign if drag fails

---

### Risk 5: Shadcn/UI Component Ownership
**Impact:** Low — components become outdated, need manual updates

**Mitigation:**
- Treat Shadcn components as project code (not dependency)
- Version control all copied components
- Review Shadcn changelog quarterly for security/accessibility fixes
- Consider Radix UI stability concerns (team shifted to Base UI)

**Note:** Radix UI team has shifted focus to Base UI. Monitor Radix stability for long-term projects. Shadcn/UI may migrate to Base UI in future.

**Source:** [Shadcn/UI vs Radix Comparison 2026](https://saasindie.com/blog/shadcn-vs-radix-themes-comparison)

## Sources

### Multi-Tenant Architecture
- [Designing Your Postgres Database for Multi-tenancy | Crunchy Data](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
- [Multi-Tenancy Implementation Approaches With Prisma and ZenStack](https://zenstack.dev/blog/multi-tenant)
- [Prisma Client Just Became a Lot More Flexible: Prisma Client Extensions](https://www.prisma.io/blog/client-extensions-preview-8t3w27xkrxxn)
- [Multi-Tenancy with Prisma: A New Approach](https://medium.com/@kz-d/multi-tenancy-with-prisma-a-new-approach-to-making-where-required-1e93a3783d9d)

### Supabase Auth & RBAC
- [Custom Claims & Role-based Access Control (RBAC) | Supabase Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Custom Access Token Hook | Supabase Docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Building Role-Based Access Control (RBAC) with Supabase RLS](https://medium.com/@lakshaykapoor08/building-role-based-access-control-rbac-with-supabase-row-level-security-c82eb1865dfd)

### Next.js & Authentication
- [Guides: Authentication | Next.js](https://nextjs.org/docs/app/guides/authentication)
- [Next.js 16: What's New for Authentication and Authorization](https://auth0.com/blog/whats-new-nextjs-16/)
- [Implement Role-Based Access Control in Next.js 15](https://clerk.com/blog/nextjs-role-based-access-control)

### Mobile PWA & Touch UX
- [Build a Next.js 16 PWA with true offline support - LogRocket](https://blog.logrocket.com/nextjs-16-pwa-offline-support)
- [Accessible Touch Target Sizes Cheatsheet — Smashing Magazine](https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/)
- [All accessible touch target sizes - LogRocket](https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/)
- [Optimizing NEXT.js Apps for Mobile Devices: Responsive Design and Touch Gestures](https://clouddevs.com/next/optimizing-for-mobile-devices/)

### Offline-First & IndexedDB
- [Dexie.js - Offline-First Database with Cloud Sync](https://dexie.org/)
- [Synchronization patterns - Mastering Dexie.js](https://app.studyraid.com/en/read/11356/355148/synchronization-patterns)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Serwist Documentation](https://serwist.pages.dev/docs/serwist/core)

### Drag & Drop Mobile
- [dnd-kit – a modern drag and drop toolkit for React](https://dndkit.com/)
- [Touch | @dnd-kit – Documentation](https://docs.dndkit.com/api-documentation/sensors/touch)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)

### Design Systems
- [shadcn/ui - The Foundation for your Design System](https://ui.shadcn.com/)
- [Class Variance Authority Documentation](https://cva.style/docs)
- [ShadCN UI vs Radix UI vs Tailwind UI, Which Should You Choose in 2025?](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25)
- [Radix Themes vs shadcn/ui: Complete Developer Comparison 2026](https://saasindie.com/blog/shadcn-vs-radix-themes-comparison)

### RBAC Patterns
- [Role-Based Access Control: A Comprehensive Guide | 2026 | Zluri](https://www.zluri.com/blog/role-based-access-control)
- [How to Design an RBAC (Role-Based Access Control) System](https://www.nocobase.com/en/blog/how-to-design-rbac-role-based-access-control-system)
- [Distributed Levels of Permission Hierarchy - Implementation of RBAC](https://www.linkedin.com/pulse/distributed-levels-permission-hierarchy-rbac-rajesh-kumar)
