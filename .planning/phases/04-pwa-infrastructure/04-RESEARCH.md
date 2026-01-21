# Phase 4: PWA Infrastructure - Research

**Researched:** 2026-01-21
**Domain:** Progressive Web Apps, Service Workers, Offline-First Architecture
**Confidence:** MEDIUM

## Summary

PWA infrastructure for Next.js 16 requires a carefully orchestrated combination of service workers (Serwist), IndexedDB (Dexie.js), and push notifications (web-push). The stack is well-established but has important compatibility constraints: Next.js 16 defaults to Turbopack but Serwist requires webpack, so production builds must use `next build --webpack`. The offline-first architecture involves three layers: service worker for asset caching, IndexedDB for data persistence, and background sync for queued mutations.

Key challenges include service worker lifecycle management, IndexedDB schema versioning, and cross-tab synchronization. The ecosystem is mature but rapidly evolving - Next.js 16's Turbopack adoption creates temporary friction with PWA tooling. Implementation requires understanding several nuanced gotchas around service worker updates, cache invalidation, and notification subscription management.

**Primary recommendation:** Use Serwist with webpack builds (not Turbopack), Dexie.js with React hooks for reactive queries, background sync for write operations, and Supabase Edge Functions for push notifications. Keep offline scope minimal (view-only for most features) and use stale-while-revalidate caching for dynamic data.

## Standard Stack

The established libraries/tools for PWA implementation in Next.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @serwist/next | Latest | Service worker integration for Next.js | Successor to next-pwa, actively maintained, webpack-based |
| serwist | Latest (dev dep) | Service worker runtime library | Modern alternative to Workbox, optimized for Next.js |
| dexie | 4.2+ | IndexedDB wrapper | Industry standard, 100k+ websites, reactive queries |
| dexie-react-hooks | Latest | React integration for Dexie | Official React bindings with useLiveQuery |
| web-push | Latest | Push notification server | Standard Node.js library for Web Push Protocol |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb | Latest | Minimal IndexedDB wrapper | Alternative to Dexie for simpler use cases |
| @supabase/functions-js | Latest | Edge Function client | Triggering push notifications from database |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Serwist | next-pwa | next-pwa is deprecated/unmaintained as of 2025 |
| Dexie.js | idb | idb is lower-level, lacks reactivity and schema management |
| web-push | Firebase Cloud Messaging | FCM adds complexity, vendor lock-in; web-push is standard |

**Installation:**
```bash
npm install @serwist/next dexie dexie-react-hooks web-push
npm install -D serwist
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts          # Dexie database schema
│   │   ├── sync-queue.ts      # Background sync queue
│   │   └── hooks.ts           # useLiveQuery wrappers
│   └── push/
│       └── subscribe.ts       # Push subscription management
├── app/
│   ├── sw.ts                  # Service worker entry point
│   └── components/
│       └── register-pwa.tsx   # PWA registration component
public/
├── sw.js                      # Generated service worker (gitignored)
├── manifest.json              # PWA manifest
└── icons/                     # PWA icons (192x192, 512x512)
```

### Pattern 1: Service Worker Setup with Serwist
**What:** Configure Next.js to build and register a service worker with caching strategies
**When to use:** Required for all PWA functionality (offline, push, install)
**Example:**
```typescript
// next.config.mjs
// Source: https://serwist.pages.dev/docs/next/getting-started
import withSerwistInit from "@serwist/next";

const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  // CRITICAL: Use webpack, not Turbopack
  disable: process.env.NODE_ENV === "development", // Optional: disable in dev
});

export default withSerwist({
  // Your Next.js config
});

// package.json scripts
{
  "dev": "next dev --turbopack",
  "build": "next build --webpack"  // Must use webpack for PWA
}
```

```typescript
// src/app/sw.ts
// Source: https://serwist.pages.dev/docs/next/getting-started
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

### Pattern 2: Runtime Caching Strategies
**What:** Configure different caching strategies for static assets, API routes, and dynamic data
**When to use:** Customizing offline behavior beyond defaults
**Example:**
```typescript
// src/app/sw.ts - Custom runtime caching
// Source: https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies
import {
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkOnly
} from "serwist";
import { ExpirationPlugin } from "@serwist/expiration";

const customCache = [
  // API routes - network first with cache fallback
  {
    urlPattern: /^\/api\/(?!auth).*/,
    handler: new NetworkFirst({
      cacheName: "api-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    }),
  },
  // Auth routes - never cache
  {
    urlPattern: /^\/api\/auth\/.*/,
    handler: new NetworkOnly(),
  },
  // Static assets - cache first
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    handler: new CacheFirst({
      cacheName: "image-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },
  // Dynamic data - stale while revalidate
  {
    urlPattern: /^\/api\/(schedules|lineups).*/,
    handler: new StaleWhileRevalidate({
      cacheName: "dynamic-data-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        }),
      ],
    }),
  },
];
```

### Pattern 3: IndexedDB Schema with Dexie
**What:** Define database schema with versioning for offline data storage
**When to use:** Storing schedules, lineups, and sync queue offline
**Example:**
```typescript
// src/lib/db/schema.ts
// Source: https://dexie.org/docs/Tutorial/React
import Dexie, { Table } from 'dexie';

export interface Schedule {
  id: string;
  teamId: string;
  date: string;
  location: string;
  notes?: string;
  updatedAt: number; // For conflict resolution
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entity: 'schedule' | 'lineup';
  entityId: string;
  payload: any;
  timestamp: number;
  retries: number;
}

export class AppDB extends Dexie {
  schedules!: Table<Schedule>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('rowops-offline');

    // Version 1: Initial schema
    this.version(1).stores({
      schedules: 'id, teamId, date, updatedAt',
      syncQueue: '++id, timestamp, entity',
    });
  }
}

export const db = new AppDB();
```

### Pattern 4: Reactive Queries with useLiveQuery
**What:** React hook that automatically re-renders when IndexedDB data changes
**When to use:** Displaying cached data that updates from service worker or other tabs
**Example:**
```typescript
// src/lib/db/hooks.ts
// Source: https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

export function useSchedules(teamId: string, daysAhead: number = 14) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

  return useLiveQuery(
    () => db.schedules
      .where('teamId').equals(teamId)
      .and(s => new Date(s.date) <= cutoffDate)
      .sortBy('date'),
    [teamId, daysAhead] // Dependencies - rerun query when these change
  );
}

export function useSyncQueueStatus() {
  return useLiveQuery(
    () => db.syncQueue.count()
  );
}
```

### Pattern 5: Background Sync Queue
**What:** Queue mutations when offline and replay when connection restored
**When to use:** Any write operation that should persist offline
**Example:**
```typescript
// src/lib/db/sync-queue.ts
// Source: Offline-first architecture patterns from web search
import { db } from './schema';

export async function queueMutation(
  operation: 'create' | 'update' | 'delete',
  entity: 'schedule' | 'lineup',
  entityId: string,
  payload: any
) {
  await db.syncQueue.add({
    operation,
    entity,
    entityId,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });

  // Trigger sync if online
  if (navigator.onLine) {
    processSyncQueue();
  }
}

export async function processSyncQueue() {
  const items = await db.syncQueue.orderBy('timestamp').toArray();

  for (const item of items) {
    try {
      const endpoint = `/api/${item.entity}/${item.operation === 'create' ? '' : item.entityId}`;
      const method = item.operation === 'delete' ? 'DELETE' :
                     item.operation === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        await db.syncQueue.delete(item.id!);
      } else if (response.status >= 500) {
        // Server error - retry later
        await db.syncQueue.update(item.id!, { retries: item.retries + 1 });
      } else {
        // Client error - remove from queue
        await db.syncQueue.delete(item.id!);
      }
    } catch (error) {
      // Network error - keep in queue
      await db.syncQueue.update(item.id!, { retries: item.retries + 1 });
    }
  }
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', processSyncQueue);
}
```

### Pattern 6: Push Notification Setup
**What:** Server-side push notification sending via web-push and Supabase Edge Functions
**When to use:** Notifying users of schedule changes, lineup assignments
**Example:**
```typescript
// Generate VAPID keys (one-time setup)
// Source: https://github.com/web-push-libs/web-push
// npx web-push generate-vapid-keys --json
// Store in .env.local:
// VAPID_PUBLIC_KEY=...
// VAPID_PRIVATE_KEY=...
// VAPID_SUBJECT=mailto:admin@rowops.com

// supabase/functions/send-notification/index.ts
// Source: https://supabase.com/docs/guides/functions/examples/push-notifications
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webpush from 'npm:web-push';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

serve(async (req) => {
  const { subscription, title, body, url } = await req.json();

  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      url,
      icon: '/icons/icon-192x192.png',
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

```typescript
// src/lib/push/subscribe.ts
// Client-side subscription management
export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications not supported');
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Store subscription in database
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  return subscription;
}
```

### Pattern 7: Install Banner with beforeinstallprompt
**What:** Custom UI to prompt PWA installation at appropriate moments
**When to use:** Improving install conversion over browser default prompts
**Example:**
```typescript
// src/app/components/install-banner.tsx
// Source: https://web.dev/articles/customize-install
'use client';
import { useEffect, useState } from 'react';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show banner if user hasn't dismissed it before
      const dismissed = localStorage.getItem('install-banner-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('install-banner-dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 p-4 bg-blue-600 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Install RowOps</p>
          <p className="text-sm">Quick access to your team's schedule</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDismiss} className="px-4 py-2">
            Not now
          </button>
          <button onClick={handleInstall} className="px-4 py-2 bg-white text-blue-600 rounded">
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Over-caching auth routes:** Never cache `/api/auth/*` or you'll serve stale tokens - use NetworkOnly
- **Blocking on service worker updates:** Don't interrupt users with update prompts - use skipWaiting: true
- **Forgetting IndexedDB versioning:** Always increment version number when changing schema or you'll corrupt data
- **Not handling multi-tab conflicts:** Multiple tabs share same IndexedDB - use `updatedAt` timestamps for conflict resolution
- **Caching without expiration:** Always use ExpirationPlugin or cache grows unbounded
- **Ignoring sync queue ordering:** Process queue in timestamp order to maintain causality

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker caching | Custom fetch interceptors | Serwist with defaultCache | Handles edge cases: range requests, opaque responses, cache versioning |
| IndexedDB queries | Raw IndexedDB API | Dexie.js | Schema management, migrations, transactions, promise-based API |
| Push notifications | Custom Web Push Protocol | web-push library | Handles VAPID authentication, payload encryption, retry logic |
| Background sync | Manual queue + fetch retry | Service Worker Background Sync API | Browser handles retry timing, respects battery/network conditions |
| Offline detection | navigator.onLine checks | Background sync + fetch errors | navigator.onLine is unreliable (reports online when no internet) |
| Schema migrations | Manual version checks | Dexie version().stores() | Handles multi-step migrations, rollback, data preservation |
| Reactive queries | Polling IndexedDB | useLiveQuery from dexie-react-hooks | Cross-tab updates, automatic re-renders, minimal re-query overhead |

**Key insight:** PWA infrastructure has many subtle edge cases (service worker lifecycle, cache invalidation, offline sync conflicts). Mature libraries handle these; custom implementations inevitably rediscover them the hard way.

## Common Pitfalls

### Pitfall 1: Service Worker Doesn't Update
**What goes wrong:** Users see stale content even after deploying new code
**Why it happens:** Browsers cache the service worker file itself; if cache headers are wrong or skipWaiting isn't set, old service worker stays active
**How to avoid:**
- Use `skipWaiting: true` and `clientsClaim: true` in Serwist config
- Don't cache `sw.js` itself with aggressive cache headers
- Next.js handles this automatically when using `@serwist/next`
**Warning signs:**
- Build hash changes but UI doesn't update
- Users report features missing that are in production code

### Pitfall 2: IndexedDB Schema Migration Conflicts
**What goes wrong:** Database corruption or lost data when schema changes
**Why it happens:** Multiple tabs open during schema upgrade, or not handling old versions properly
**How to avoid:**
- Always increment version number in Dexie
- Handle `onupgradeneeded` correctly (Dexie does this)
- Never delete object stores that contain unsynced data
- Test migrations with old schema versions
**Warning signs:**
- "VersionError" in console
- Users report data loss after updates
- Queries fail with "NotFoundError"

### Pitfall 3: Push Subscription Expiration
**What goes wrong:** Push notifications stop working silently
**Why it happens:** Browsers periodically expire subscriptions; server doesn't detect failures
**How to avoid:**
- Check `subscription.expirationTime` on client
- Handle 410 Gone responses from push service
- Re-subscribe when subscription expires or fails
- Store subscription status in database with last verified timestamp
**Warning signs:**
- Push notifications work initially then stop
- 410 HTTP status codes in push send logs
- Users don't receive notifications but no errors shown

### Pitfall 4: Turbopack Incompatibility
**What goes wrong:** Build fails or service worker isn't generated in Next.js 16
**Why it happens:** Serwist requires webpack but Next.js 16 defaults to Turbopack
**How to avoid:**
- Use `next build --webpack` for production builds
- Add `--webpack` flag to build script in package.json
- Document this requirement for CI/CD pipelines
- Consider adding build warning if webpack flag missing
**Warning signs:**
- "Cannot find module" errors for webpack config
- `public/sw.js` not generated after build
- PWA features work in development but not production

### Pitfall 5: Offline Indicator False Positives
**What goes wrong:** App shows "offline" when internet is available
**Why it happens:** `navigator.onLine` is unreliable (shows online when connected to network without internet)
**How to avoid:**
- Don't rely solely on `navigator.onLine`
- Test actual connectivity with fetch to known endpoint
- Show offline message only when fetch fails, not when onLine is false
- Implement exponential backoff for connectivity checks
**Warning signs:**
- Users on slow/metered connections see offline messages
- App switches between online/offline rapidly
- Cached content shown even with working internet

### Pitfall 6: Background Sync Queue Ordering
**What goes wrong:** Operations execute out of order causing data inconsistencies
**Why it happens:** Async operations don't guarantee queue order; retries interleave with new operations
**How to avoid:**
- Process queue sequentially (await each operation)
- Use timestamp ordering: `orderBy('timestamp')`
- Don't process queue in parallel
- Mark dependencies (e.g., create before update)
**Warning signs:**
- Update operations fail because create hasn't synced yet
- Delete operations succeed but entity is recreated
- Duplicate entities created after sync

### Pitfall 7: Cache Staleness Without Indicators
**What goes wrong:** Users see outdated data without knowing it's stale
**Why it happens:** Stale-while-revalidate serves cache immediately; revalidation happens silently
**How to avoid:**
- Store `cachedAt` timestamp with data
- Display "Last updated X ago" in UI
- Show warning badge when data older than threshold (24h)
- Never block on staleness - always show cached data
**Warning signs:**
- Users report seeing old lineup assignments
- Schedule changes don't appear for some users
- Support requests about "wrong" data that's actually cached

## Code Examples

Verified patterns from official sources:

### Service Worker Registration with Auto-Update
```typescript
// src/app/layout.tsx
// Source: https://serwist.pages.dev/docs/next/configuring/register
'use client';
import { useEffect } from 'react';

export function RegisterPWA() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.serwist !== undefined) {
      window.serwist.register();

      // Optional: Listen for updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}
```

### Dexie Schema Migration Example
```typescript
// src/lib/db/schema.ts
// Source: IndexedDB migration patterns research
export class AppDB extends Dexie {
  constructor() {
    super('rowops-offline');

    // Version 1: Initial schema
    this.version(1).stores({
      schedules: 'id, teamId, date',
    });

    // Version 2: Add updatedAt for conflict resolution
    this.version(2).stores({
      schedules: 'id, teamId, date, updatedAt',
    }).upgrade(tx => {
      // Migrate existing records
      return tx.table('schedules').toCollection().modify(schedule => {
        schedule.updatedAt = Date.now();
      });
    });

    // Version 3: Add sync queue
    this.version(3).stores({
      schedules: 'id, teamId, date, updatedAt',
      syncQueue: '++id, timestamp, entity',
    });
  }
}
```

### Web App Manifest
```json
// public/manifest.json
// Source: https://web.dev/articles/add-manifest
{
  "name": "RowOps - Crew Team Management",
  "short_name": "RowOps",
  "description": "Manage your rowing team's schedule, lineups, and equipment",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/schedule.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "label": "View practice schedule"
    }
  ]
}
```

### Handling Service Worker Push Events
```typescript
// src/app/sw.ts
// Source: Web Push API patterns research
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() || {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'RowOps', {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: { url: data.url },
      tag: data.tag, // Prevents duplicate notifications
      renotify: false,
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa | Serwist (@serwist/next) | 2024-2025 | next-pwa deprecated; Serwist is actively maintained successor |
| Workbox directly | Serwist | 2024 | Serwist provides better Next.js integration, simpler API |
| Webpack (Next.js 15) | Turbopack (Next.js 16) | Oct 2025 | PWA tools still require webpack; use `--webpack` flag |
| Manual IndexedDB | Dexie.js | Established | Dexie v4 adds CRDT support, better TypeScript |
| Firebase Cloud Messaging | web-push (standard) | Ongoing | Direct Web Push Protocol reduces vendor dependency |
| Manual install prompts | beforeinstallprompt event | Established | Chrome-only but provides better UX than default |

**Deprecated/outdated:**
- **next-pwa**: Unmaintained as of 2025; use Serwist instead
- **Workbox direct usage**: Serwist wraps Workbox with Next.js optimizations
- **PushManager without VAPID**: Older FCM approach; use VAPID keys instead

## Open Questions

Things that couldn't be fully resolved:

1. **Turbopack Full PWA Support**
   - What we know: Next.js 16 defaults to Turbopack but Serwist requires webpack
   - What's unclear: Timeline for Turbopack-native PWA tooling
   - Recommendation: Use `next build --webpack` and monitor Serwist/Next.js updates; may need to migrate approach in 2026

2. **Cross-Tab IndexedDB Lock Conflicts**
   - What we know: Multiple tabs share same IndexedDB; transactions can conflict
   - What's unclear: Best pattern for handling concurrent writes from multiple tabs
   - Recommendation: Use `updatedAt` timestamps for conflict resolution (last-write-wins); consider BroadcastChannel for coordination

3. **iOS Push Notification Limitations**
   - What we know: iOS has stricter PWA requirements; push notifications limited to installed PWAs
   - What's unclear: Current iOS support status for web push (evolving in iOS 16+)
   - Recommendation: Test on actual iOS devices; may need fallback to in-app notifications

4. **Supabase Edge Function Cold Starts**
   - What we know: Deno Edge Functions can have cold start latency
   - What's unclear: Impact on push notification delivery timing
   - Recommendation: Consider notification batching for non-critical updates; monitor delivery latency

5. **Service Worker Scope with Next.js App Router**
   - What we know: Service worker scope affects which routes it controls
   - What's unclear: Best practices for scoping with dynamic routes and route groups
   - Recommendation: Use root scope (`/`) and rely on routing patterns in runtime caching

## Sources

### Primary (HIGH confidence)
- [@serwist/next documentation](https://serwist.pages.dev/docs/next/getting-started) - Installation and configuration
- [Serwist runtime caching strategies](https://serwist.pages.dev/docs/serwist/runtime-caching/caching-strategies) - Caching patterns
- [Dexie.js official site](https://dexie.org/) - IndexedDB wrapper overview
- [Dexie React hooks](https://dexie.org/docs/dexie-react-hooks/useLiveQuery()) - useLiveQuery API
- [web-push GitHub](https://github.com/web-push-libs/web-push) - VAPID setup
- [Supabase push notifications](https://supabase.com/docs/guides/functions/examples/push-notifications) - Edge Function integration
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) - Web standards
- [MDN PWA Manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) - Manifest specification

### Secondary (MEDIUM confidence)
- [LogRocket: Next.js 16 PWA](https://blog.logrocket.com/nextjs-16-pwa-offline-support) - Next.js 16 patterns (Jan 2026)
- [Offline-first PWA with Next.js and IndexedDB](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9) - Architecture patterns
- [Microsoft Edge: Background Sync](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs) - Background sync patterns
- [Chrome Developers: Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview) - Workbox caching
- [web.dev: Install Prompt](https://web.dev/articles/customize-install) - beforeinstallprompt patterns
- [GitHub: PWA bugs list](https://github.com/PWA-POLICE/pwa-bugs) - Known platform issues
- [GitHub: Next.js offline-first discussion](https://github.com/vercel/next.js/discussions/82498) - Community patterns

### Tertiary (LOW confidence)
- WebSearch results on conflict resolution patterns - General approaches, needs verification
- Various blog posts on offline-first architecture - Conceptual guidance, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation and active community usage verified
- Architecture: MEDIUM - Patterns verified through official docs but Next.js 16 specifics still evolving
- Pitfalls: MEDIUM - Based on documented issues and community reports; some from experience reports

**Research date:** 2026-01-21
**Valid until:** 2026-02-28 (30 days - PWA ecosystem is stable but Next.js/Turbopack evolving rapidly)
