# Architecture Patterns

**Domain:** Rowing Team Operations SaaS (Multi-tenant PWA)
**Researched:** 2026-01-20
**Confidence:** MEDIUM (patterns synthesized from sports scheduling, rowing domain, and PWA best practices)

## Executive Summary

RowOps requires a hybrid architecture combining:
1. **Server-first CRUD** for team/athlete management (existing)
2. **Offline-first local storage** for regatta/practice operations (new)
3. **Event-driven sync** for multi-device coordination
4. **Temporal data modeling** for schedules, lineups, and seasons

The key architectural challenge is the **dual operating mode**: normal operations (connected, server-authoritative) vs. regatta mode (offline-first, local-authoritative with eventual sync).

---

## System Architecture Overview

```
+------------------------------------------------------------------+
|                        CLIENT (PWA)                               |
+------------------------------------------------------------------+
|  +------------------+  +------------------+  +------------------+ |
|  |   React/Next.js  |  |  Service Worker  |  |   IndexedDB      | |
|  |   UI Components  |  |  (Serwist)       |  |   Local Store    | |
|  +--------+---------+  +--------+---------+  +--------+---------+ |
|           |                     |                     |           |
|           v                     v                     v           |
|  +----------------------------------------------------------+    |
|  |              Repository Layer (Offline-First)             |    |
|  |  - Reads from IndexedDB first                            |    |
|  |  - Queues writes for background sync                     |    |
|  |  - Manages conflict resolution                           |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
                              |
                    [Background Sync / Network]
                              |
+------------------------------------------------------------------+
|                        SERVER                                     |
+------------------------------------------------------------------+
|  +------------------+  +------------------+  +------------------+ |
|  |  Next.js API     |  |  Prisma ORM      |  |  Supabase        | |
|  |  Routes          |  |  + RLS Helper    |  |  PostgreSQL      | |
|  +--------+---------+  +--------+---------+  +--------+---------+ |
|           |                     |                     |           |
|           v                     v                     v           |
|  +----------------------------------------------------------+    |
|  |           External Integrations                           |    |
|  |  - RegattaCentral API (OAuth2, JSON)                     |    |
|  |  - Push notification service                             |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
```

---

## Component Boundaries

### 1. Data Layer Components

| Component | Responsibility | Talks To | Confidence |
|-----------|---------------|----------|------------|
| **Prisma Schema** | Define entities, relations, multi-tenant scoping | PostgreSQL via Supabase | HIGH |
| **RLS Policies** | Enforce tenant isolation at database level | PostgreSQL directly | HIGH |
| **IndexedDB Store** | Local cache of schedules, lineups, assignments | Service Worker, Repository | MEDIUM |
| **Repository Layer** | Abstract data access, offline-first reads | IndexedDB, API routes | MEDIUM |

### 2. Domain Logic Components

| Component | Responsibility | Talks To | Confidence |
|-----------|---------------|----------|------------|
| **Practice Scheduler** | Create/edit practice sessions with time blocks | Repository, UI | HIGH |
| **Lineup Manager** | Assign athletes to seats, validate constraints | Repository, UI | HIGH |
| **Boat Matcher** | Match lineup requirements to available boats | Lineup Manager | MEDIUM |
| **Eligibility Engine** | Check athlete eligibility within season scope | Season Context, Athletes | MEDIUM |
| **Regatta Sync** | Pull/push data to RegattaCentral API | External API, Repository | LOW |

### 3. Infrastructure Components

| Component | Responsibility | Talks To | Confidence |
|-----------|---------------|----------|------------|
| **Service Worker** | Cache shell, handle offline, background sync | IndexedDB, Network | HIGH |
| **Sync Queue** | Queue mutations when offline, replay on reconnect | Service Worker, API | MEDIUM |
| **Conflict Resolver** | Handle sync conflicts (last-write-wins + manual) | Sync Queue, UI | MEDIUM |
| **Push Manager** | Send notifications for race times, lineup changes | Supabase, FCM/APNs | LOW |

---

## Data Model Architecture

### Core Entity Relationships

```
Tenant (Organization)
  |
  +-- Season (time-bounded container)
  |     |
  |     +-- Athletes (eligibility scoped to season)
  |     +-- Boats (inventory)
  |     +-- Practices
  |     +-- Regattas
  |
  +-- Practice
  |     |
  |     +-- TimeBlocks (water/land/erg)
  |           |
  |           +-- WaterBlock --> Lineup --> Assignments
  |           +-- LandBlock --> Groups --> Athletes
  |           +-- ErgBlock --> Groups --> Athletes (+ erg metadata)
  |
  +-- Regatta (pulled from RegattaCentral)
        |
        +-- Events (races)
              |
              +-- Entries --> Lineups --> Athletes
```

### Practice Session Model

Based on rowing training patterns, practices decompose into typed blocks:

```typescript
// Practice contains multiple time blocks
interface Practice {
  id: string;
  tenantId: string;
  seasonId: string;
  date: Date;
  startTime: Time;
  endTime: Time;
  location: string;
  blocks: TimeBlock[];
}

// Block types with different metadata requirements
type TimeBlock = WaterBlock | LandBlock | ErgBlock;

interface WaterBlock {
  type: 'water';
  startTime: Time;
  duration: number; // minutes
  lineup: Lineup;
  notes?: string;
}

interface LandBlock {
  type: 'land';
  startTime: Time;
  duration: number;
  activity: string; // 'warmup' | 'strength' | 'flexibility' | 'custom'
  groups: AthleteGroup[];
}

interface ErgBlock {
  type: 'erg';
  startTime: Time;
  duration: number;
  workout: ErgWorkout;
  groups: AthleteGroup[];
}

// Erg workouts have interval/distance structure
interface ErgWorkout {
  type: 'interval' | 'distance' | 'time';
  intervals?: { work: number; rest: number; reps: number }; // e.g., 3x3min/3min
  distance?: number; // meters
  time?: number; // minutes
  targetPace?: number; // seconds per 500m
}
```

### Lineup-First Assignment Model

Key insight from rowing domain: lineups are defined by seats first, then matched to compatible boats.

```typescript
// Lineup defines the abstract crew configuration
interface Lineup {
  id: string;
  name: string; // e.g., "Varsity 8+"
  boatClass: BoatClass; // '8+' | '4+' | '4-' | '2x' | '1x' | etc.
  seats: Seat[];
  assignedBoatId?: string; // optional - boat assigned after lineup
}

// Seat with position and athlete assignment
interface Seat {
  position: number; // 1 = bow, 8 = stroke, 0 = cox
  role: 'rower' | 'coxswain';
  side?: 'port' | 'starboard'; // for sweep boats
  athleteId?: string;
}

// Boat is physical equipment with compatibility constraints
interface Boat {
  id: string;
  name: string;
  boatClass: BoatClass;
  rigType: 'sweep' | 'scull';
  weightClass?: 'lightweight' | 'heavyweight';
  status: 'available' | 'maintenance' | 'retired';
}

// Assignment links athlete to seat with validation
interface Assignment {
  lineupId: string;
  seatPosition: number;
  athleteId: string;
  validatedAt: Date;
  conflicts?: string[]; // e.g., "weight exceeds limit"
}
```

### Regatta Mode State Machine

Regattas operate as temporary state overlays on normal operations:

```
[Normal Mode]
     |
     v (activate regatta)
[Regatta Mode: Syncing]
     |
     v (sync complete)
[Regatta Mode: Active]
     |
     +-- Offline operations cached locally
     +-- Lineup changes queued
     +-- Race times trigger notifications
     |
     v (regatta ends)
[Regatta Mode: Reconciling]
     |
     v (conflicts resolved)
[Normal Mode]
```

```typescript
interface RegattaState {
  regattaId: string;
  mode: 'syncing' | 'active' | 'reconciling' | 'complete';
  lastSync: Date;
  pendingChanges: OfflineChange[];
  conflicts: SyncConflict[];
}

interface OfflineChange {
  id: string;
  type: 'lineup_update' | 'scratch' | 'substitution';
  payload: unknown;
  createdAt: Date;
  synced: boolean;
}
```

---

## Data Flow Patterns

### Pattern 1: Normal Mode CRUD (Server-Authoritative)

```
User Action
    |
    v
[UI Component]
    |
    v (API call)
[Next.js API Route]
    |
    v (Prisma + tenant scoping)
[PostgreSQL with RLS]
    |
    v (response)
[UI updates via React Query / SWR]
```

**Implementation:** Standard Next.js patterns. Existing CRUD likely follows this.

### Pattern 2: Offline-First Reads (Cache-First)

```
User opens schedule view
    |
    v
[Repository.getSchedule()]
    |
    v
[IndexedDB.get('schedules', id)]
    |
    +--> HIT: Return cached data, trigger background refresh
    |
    +--> MISS: Fetch from API, cache result
```

**Implementation:** Repository pattern with IndexedDB as primary read source.

### Pattern 3: Offline Writes with Background Sync

```
User updates lineup (offline)
    |
    v
[Repository.updateLineup()]
    |
    v
[IndexedDB.put() - optimistic update]
    |
    v
[SyncQueue.enqueue() - queue for later]
    |
    v (connectivity restored)
[Service Worker 'sync' event]
    |
    v
[SyncQueue.flush() - replay to API]
    |
    v (success)
[IndexedDB.markSynced()]
    |
    v (conflict)
[ConflictResolver.handle()]
```

**Implementation:** Use Background Sync API via service worker. Queue stored in IndexedDB.

### Pattern 4: RegattaCentral Integration

```
Coach activates regatta mode
    |
    v
[RegattaSync.activate(regattaId)]
    |
    v (OAuth2 token exchange)
[RegattaCentral API v4]
    |
    v (pull events, entries, schedule)
[Transform to internal model]
    |
    v
[Store in IndexedDB + PostgreSQL]
    |
    v (during regatta)
[Local changes queued]
    |
    v (on publish)
[Push results to RegattaCentral]
```

**Note:** RegattaCentral API uses OAuth2 with client credentials. Results are pushed in "cooked" format (timing system calculates margins, penalties).

---

## Offline-First Architecture Details

### Service Worker Strategy (Serwist/Workbox)

Based on Next.js 15 PWA patterns:

```typescript
// sw.ts - Service Worker configuration
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // App shell - cache first
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'static-assets' }
    },
    // API data - network first with fallback
    {
      urlPattern: /^\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxAgeSeconds: 300 } // 5 min
      }
    },
    // Images - cache first, long expiry
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxAgeSeconds: 2592000 } // 30 days
      }
    }
  ]
});
```

### IndexedDB Schema

```typescript
// Database structure for offline storage
interface RowOpsDB {
  // Sync metadata
  syncMeta: {
    key: string; // 'lastSync', 'pendingCount', etc.
    value: unknown;
  };

  // Cached entities (mirror of server data)
  practices: Practice[];
  lineups: Lineup[];
  athletes: Athlete[];
  boats: Boat[];
  regattas: Regatta[];

  // Offline mutation queue
  syncQueue: {
    id: string;
    operation: 'create' | 'update' | 'delete';
    entity: string;
    payload: unknown;
    timestamp: number;
    retries: number;
  }[];

  // Conflict resolution pending
  conflicts: {
    id: string;
    localVersion: unknown;
    serverVersion: unknown;
    resolvedAt?: number;
    resolution?: 'local' | 'server' | 'merged';
  }[];
}
```

### Conflict Resolution Strategy

For RowOps, recommend **hybrid approach**:

| Data Type | Strategy | Rationale |
|-----------|----------|-----------|
| Practice schedules | Last-write-wins | Coaches unlikely to edit same practice simultaneously |
| Lineup assignments | Last-write-wins + notification | Critical data, notify if overwritten |
| Race results | Manual resolution | Cannot auto-resolve timing conflicts |
| Athlete data | Last-write-wins | Low conflict probability |
| Boat status | Last-write-wins | Simple status flags |

```typescript
// Conflict resolution logic
function resolveConflict(conflict: SyncConflict): Resolution {
  const { entity, localVersion, serverVersion } = conflict;

  // Auto-resolve with last-write-wins for most entities
  if (['practice', 'lineup', 'athlete', 'boat'].includes(entity)) {
    const localTime = localVersion.updatedAt;
    const serverTime = serverVersion.updatedAt;

    if (localTime > serverTime) {
      return { action: 'push', data: localVersion };
    } else {
      return { action: 'pull', data: serverVersion };
    }
  }

  // Manual resolution for race results
  if (entity === 'result') {
    return { action: 'manual', conflict };
  }
}
```

---

## Multi-Tenant Architecture

### Tenant Scoping with Prisma + Supabase RLS

**Layer 1: Prisma Client Extension** (application-level)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query, model }) {
        // Inject tenantId into all queries
        const tenantId = getTenantFromContext();

        if (args.where) {
          args.where.tenantId = tenantId;
        } else {
          args.where = { tenantId };
        }

        return query(args);
      }
    }
  }
});
```

**Layer 2: PostgreSQL RLS** (database-level defense)

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their tenant's data
CREATE POLICY tenant_isolation ON practices
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context on each request
-- (called from Next.js API route before queries)
SET app.tenant_id = 'tenant-uuid-here';
```

### Season Scoping for Eligibility

Seasons act as containers that scope athlete eligibility:

```typescript
// Eligibility check respects season boundaries
async function checkEligibility(
  athleteId: string,
  seasonId: string
): Promise<EligibilityResult> {
  const enrollment = await prisma.seasonEnrollment.findUnique({
    where: { athleteId_seasonId: { athleteId, seasonId } }
  });

  if (!enrollment) {
    return { eligible: false, reason: 'not_enrolled' };
  }

  if (enrollment.status !== 'active') {
    return { eligible: false, reason: enrollment.status };
  }

  return { eligible: true };
}
```

---

## Component Dependencies & Build Order

### Dependency Graph

```
[Foundation Layer]
  Prisma Schema + RLS Policies
  Multi-tenant context provider
        |
        v
[Data Layer]
  Repository pattern implementation
  IndexedDB store setup
        |
        v
[Domain Layer - Phase 1]
  Practice Session model
  Time Block types (water/land/erg)
        |
        v
[Domain Layer - Phase 2]
  Lineup model (seats, positions)
  Boat matching logic
  Assignment validation
        |
        v
[Offline Infrastructure]
  Service Worker (Serwist)
  Sync Queue
  Conflict Resolution
        |
        v
[Domain Layer - Phase 3]
  Regatta mode state machine
  RegattaCentral API integration
  Push notifications
```

### Suggested Build Order

| Phase | Components | Rationale |
|-------|------------|-----------|
| **1. Data Foundation** | Prisma schema updates, RLS policies, Season model | Everything depends on data model |
| **2. Practice Scheduling** | Practice entity, TimeBlock types, basic CRUD | Core daily operations |
| **3. Lineup Management** | Lineup entity, Seat model, Assignment logic | Builds on practice blocks |
| **4. Boat Matching** | Boat compatibility, matching algorithm | Extends lineup functionality |
| **5. Offline Infrastructure** | Service Worker, IndexedDB, Repository pattern | Required before regatta mode |
| **6. Regatta Mode** | State machine, RegattaCentral sync, offline queue | Highest complexity, needs offline |
| **7. Push Notifications** | FCM/APNs integration, race time alerts | Enhancement layer |

### Critical Path Items

1. **IndexedDB schema must be designed upfront** - Migrations are complex
2. **Offline repository pattern before regatta features** - Regatta mode depends on offline capability
3. **RLS policies with Prisma early** - Security foundation
4. **Service worker in dev mode** - Test offline behavior throughout

---

## Anti-Patterns to Avoid

### 1. Direct Database Access from Components

**Wrong:**
```typescript
// Component directly queries database
const athletes = await prisma.athlete.findMany();
```

**Right:**
```typescript
// Component uses repository with offline support
const athletes = await athleteRepository.findAll();
```

### 2. Synchronous Offline Checks

**Wrong:**
```typescript
if (navigator.onLine) {
  fetchFromServer();
} else {
  fetchFromCache();
}
```

**Right:**
```typescript
// Always try cache first, network as enhancement
const data = await repository.get(id);
// Repository handles cache/network internally
```

### 3. Ignoring Tenant Context in Offline Storage

**Wrong:**
```typescript
// Store without tenant scoping
await idb.put('lineups', lineup);
```

**Right:**
```typescript
// Include tenant in key or separate stores
await idb.put('lineups', {
  ...lineup,
  _tenantId: tenantId,
  _syncKey: `${tenantId}:${lineup.id}`
});
```

### 4. Blocking UI on Sync

**Wrong:**
```typescript
// Block user until sync completes
await syncToServer();
showUI();
```

**Right:**
```typescript
// Optimistic UI, async sync
showUI();
syncToServer().catch(queueForRetry);
```

---

## Performance Considerations

| Concern | Approach |
|---------|----------|
| IndexedDB query speed | Index on tenantId, seasonId, date fields |
| Initial load time | Precache critical routes, lazy load regatta features |
| Sync queue size | Limit to 1000 pending operations, warn user |
| Cache storage limits | Check quota via navigator.storage.estimate(), prune old seasons |
| Service worker updates | Use skipWaiting + clientsClaim, show update prompt |

---

## Sources

**Offline-First PWA:**
- [Building Native-Like Offline Experience in Next.js PWAs](https://www.getfishtank.com/insights/building-native-like-offline-experience-in-nextjs-pwas) - MEDIUM confidence
- [Offline-First Frontend Apps 2025: IndexedDB and SQLite](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) - HIGH confidence
- [PWA Setup Guide for Next.js 15](https://dev.to/rakibcloud/progressive-web-app-pwa-setup-guide-for-nextjs-15-complete-step-by-step-walkthrough-2b85) - MEDIUM confidence

**Conflict Resolution:**
- [IDBSideSync - CRDT for IndexedDB](https://github.com/clintharris/IDBSideSync) - MEDIUM confidence
- [Best CRDT Libraries 2025](https://velt.dev/blog/best-crdt-libraries-real-time-data-sync) - MEDIUM confidence

**Multi-Tenant Patterns:**
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) - HIGH confidence
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - HIGH confidence
- [Multi-Tenancy Implementation with Prisma and ZenStack](https://zenstack.dev/blog/multi-tenant) - MEDIUM confidence

**Rowing Domain:**
- [iCrew Rowing Club Management](https://www.icrew.club/) - domain patterns
- [Data Science of Rowing Crew Selection](https://medium.com/@harry.powell72/the-data-science-of-rowing-crew-selection-16e5692cca79) - lineup algorithms
- [RegattaCentral API](https://api.regattacentral.com/) - integration reference

**Sports Scheduling:**
- [W3C Sports Competition Data Model](https://w3c.github.io/opentrack-cg/spec/competition/) - HIGH confidence
- [Datensen PostgreSQL Sports Tournament Model](https://www.datensen.com/blog/data-model/designing-a-sports-tournament-data-model/) - MEDIUM confidence
