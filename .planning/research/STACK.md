# Technology Stack

**Project:** RowOps - Rowing Team Operations SaaS
**Dimension:** PWA, Offline-First, Push Notifications, External API Integration
**Researched:** 2026-01-20
**Overall Confidence:** HIGH

## Executive Summary

This stack recommendation extends your existing Next.js 16 + Prisma 6 + Supabase setup with PWA capabilities optimized for race-day offline scenarios at regattas. The key insight: **offline-first for rowing apps means caching read data (schedules, lineups) while queuing writes (timing, attendance) for sync when connectivity returns**.

## Recommended Stack

### PWA & Service Worker

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@serwist/next** | ^9.5.0 | Service worker integration for Next.js | HIGH |
| **serwist** | ^9.5.0 | Workbox-based SW tooling (dev dependency) | HIGH |

**Rationale:**
- Serwist is the **official successor** to next-pwa, actively maintained
- [Next.js official docs](https://nextjs.org/docs/app/guides/progressive-web-apps) recommend Serwist for offline functionality
- Built on Workbox (Google's SW library used by 54% of mobile sites)
- The original `next-pwa` is abandoned (last update 2+ years ago)
- `@ducanh2912/next-pwa` is deprecated by its own maintainer in favor of Serwist

**Configuration:**
```typescript
// next.config.mjs
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
});

export default withSerwist(nextConfig);
```

### Offline Data Storage

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Dexie.js** | ^4.2.1 | IndexedDB wrapper for offline storage | HIGH |

**Rationale:**
- Dexie provides a **fluent, Promise-based API** over raw IndexedDB
- Supports versioning, schema migrations, and reactive queries
- Superior performance for complex queries vs. `idb` (~1.19kb but minimal features)
- Optional Dexie Cloud available if you need sync later (but Supabase handles this)
- Widely used in production offline-first PWAs

**Why NOT `idb`:**
- idb is lighter (1.19kb) but lacks versioning, migrations, and bulk operations
- For regatta data (lineups, schedules, results), you need query capabilities
- Dexie's extra ~10kb is worth the DX improvement

**Usage Pattern for RowOps:**
```typescript
// db/offlineDb.ts
import Dexie, { Table } from 'dexie';

interface CachedRace {
  id: string;
  regattaId: string;
  eventName: string;
  scheduledTime: Date;
  lineup: string[];
  syncedAt: Date;
}

class RowOpsOfflineDB extends Dexie {
  races!: Table<CachedRace>;
  pendingActions!: Table<PendingAction>;

  constructor() {
    super('rowops-offline');
    this.version(1).stores({
      races: 'id, regattaId, scheduledTime',
      pendingActions: '++id, type, createdAt, [synced+createdAt]'
    });
  }
}
```

### Push Notifications

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **web-push** | ^3.6.7 | Server-side VAPID push notifications | HIGH |
| **Native Push API** | Browser API | Client-side subscription management | HIGH |

**Rationale:**
- `web-push` is the **standard Node.js library** for Web Push Protocol
- Zero vendor lock-in (vs. third-party services like OneSignal, PushEngage)
- VAPID keys provide server identification without GCM dependency
- Works with existing Supabase backend (trigger notifications on DB events)

**Why NOT third-party services:**
- PushEngage, Webpushr etc. add cost and vendor dependency
- For athlete notifications about races, you control the data and timing
- web-push + Supabase Edge Functions = complete solution

**Architecture:**
```
Athlete subscribes (browser)
  -> Store PushSubscription in Supabase
  -> Race schedule changes
  -> Supabase trigger/Edge Function
  -> web-push sends notification
  -> Service worker shows notification
```

**Payload Limit:** 4KB (Chrome/Firefox), 2KB (Safari) - sufficient for race alerts

### Real-Time Updates

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@supabase/supabase-js** | ^2.91.0 | Existing - includes Realtime | HIGH |
| **Supabase Broadcast** | Built-in | Recommended for scalable real-time | HIGH |

**Rationale:**
- You already have Supabase - **use its built-in Realtime, don't add another layer**
- Supabase recommends **Broadcast over Postgres Changes** at scale
- Postgres Changes checks RLS for every subscriber (100 users = 100 reads per change)
- Broadcast is lower latency and scales better

**Architecture Recommendation:**
```typescript
// Use Broadcast with a Postgres trigger for scalability
// Trigger sends to broadcast channel, clients subscribe to channel

// Client subscription
supabase.channel('race-updates')
  .on('broadcast', { event: 'race-changed' }, (payload) => {
    updateLocalRace(payload);
  })
  .subscribe();
```

**Cost Awareness:**
- $2.50 per 1M messages
- $10 per 1,000 peak connections
- For race-day usage, this is minimal cost

### Regatta Central API Integration

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **react-oauth2-code-pkce** | ^1.23.4 | OAuth2 PKCE flow for SPA | MEDIUM |
| **Native fetch** | Browser API | API calls with token injection | HIGH |

**Rationale for OAuth2 approach:**

The RegattaCentral API v4 uses standard OAuth2 with client credentials. However, their OAuth flow requires:
- client_id and client_secret (server-side)
- User's RegattaCentral credentials for token exchange
- Token endpoint: `https://api.regattacentral.com/oauth2/api/token`
- TLS 1.2+ required
- CORS only with registered referer URLs

**Recommended Pattern:**
```
User clicks "Connect Regatta Central"
  -> Redirect to RC OAuth authorize
  -> Callback with auth code
  -> Server exchanges code for tokens (keeps client_secret secure)
  -> Store refresh_token encrypted in DB
  -> Access token used for API calls
  -> Auto-refresh when expired
```

**Why `react-oauth2-code-pkce`:**
- PKCE adds security layer for browser-based OAuth
- Zero dependencies, well-maintained
- Handles token refresh automatically
- Works with Next.js (needs 'use client' marking)

**Alternative: Server-side only OAuth:**
Given RC's CORS restrictions and client_secret requirement, you may want to handle OAuth entirely server-side via Next.js API routes. This is actually **more secure** and avoids CORS issues.

**MEDIUM confidence** because: RC API docs don't specify PKCE support. May need pure server-side OAuth instead.

### Background Sync (Offline Actions)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **workbox-background-sync** | ^7.4.0 | Queue failed requests for retry | MEDIUM |
| **Custom queue + Dexie** | - | Fallback for Safari/Firefox | HIGH |

**Browser Support Reality:**
Background Sync API support is **LIMITED**:
- Chrome/Edge/Opera: Supported (49+)
- Safari: NOT SUPPORTED (all versions)
- Firefox: NOT SUPPORTED (all versions)
- Global coverage: ~80%

**Recommended Hybrid Approach:**
```typescript
// Attempt Background Sync, fall back to manual sync
async function queueOfflineAction(action: PendingAction) {
  await offlineDb.pendingActions.add(action);

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    // Chromium browsers - use Background Sync
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-pending-actions');
  } else {
    // Safari/Firefox - sync on reconnect or app focus
    window.addEventListener('online', syncPendingActions, { once: true });
  }
}
```

**Why MEDIUM confidence:**
Safari users (significant portion of athletes on iOS) won't get automatic background sync. Must implement manual sync triggers.

## Full Installation

```bash
# PWA & Service Worker
npm install @serwist/next
npm install -D serwist

# Offline Storage
npm install dexie

# Push Notifications (server-side)
npm install web-push

# OAuth (if client-side flow)
npm install react-oauth2-code-pkce

# Already have (verify versions)
# @supabase/supabase-js@^2.91.0
```

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| **next-pwa** | Abandoned, last update 2+ years ago |
| **@ducanh2912/next-pwa** | Deprecated by maintainer in favor of Serwist |
| **localforage** | Legacy, Dexie is more modern and performant |
| **idb** | Too minimal for complex offline queries |
| **Socket.io** | Unnecessary - Supabase Realtime handles this |
| **Pusher/Ably** | Unnecessary - Supabase Realtime handles this |
| **OneSignal/PushEngage** | Vendor lock-in, cost, web-push is sufficient |
| **Firebase Messaging** | Google lock-in, Supabase + web-push is cleaner |

## TypeScript Configuration

```json
// tsconfig.json additions for service worker
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  }
}
```

## Environment Variables

```bash
# .env.local

# VAPID keys for push notifications (generate once, keep forever)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# Regatta Central OAuth
REGATTA_CENTRAL_CLIENT_ID=your_client_id
REGATTA_CENTRAL_CLIENT_SECRET=your_client_secret

# Existing Supabase vars should already be set
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys --json
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
├─────────────────────────────────────────────────────────────┤
│  React App (Next.js 16)                                     │
│  ├── Push subscription management                           │
│  ├── Dexie.js offline database                              │
│  └── Realtime subscriptions (Supabase)                      │
├─────────────────────────────────────────────────────────────┤
│  Service Worker (Serwist)                                   │
│  ├── Cache: App shell, static assets                        │
│  ├── Cache: Race schedules, lineups (stale-while-revalidate)│
│  ├── Queue: Pending actions (attendance, timing)            │
│  └── Push: Display notifications                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVER                                │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes / Server Actions                        │
│  ├── OAuth token management (Regatta Central)               │
│  ├── Push notification sending (web-push)                   │
│  └── Offline action sync endpoint                           │
├─────────────────────────────────────────────────────────────┤
│  Supabase                                                   │
│  ├── Auth (existing)                                        │
│  ├── Database (Prisma) (existing)                           │
│  ├── Realtime Broadcast (race updates)                      │
│  ├── Edge Functions (push triggers)                         │
│  └── Storage (existing)                                     │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  └── Regatta Central v4 (OAuth2, JSON)                      │
└─────────────────────────────────────────────────────────────┘
```

## Confidence Summary

| Component | Confidence | Notes |
|-----------|------------|-------|
| Serwist for PWA | HIGH | Official recommendation, actively maintained, verified v9.5.0 |
| Dexie for offline | HIGH | Proven library, v4.2.1 verified, excellent DX |
| web-push for notifications | HIGH | Standard library, v3.6.7 verified, no lock-in |
| Supabase Realtime | HIGH | Already using Supabase, Broadcast recommended |
| Background Sync | MEDIUM | 80% browser coverage, Safari/Firefox need fallback |
| RC OAuth integration | MEDIUM | Standard OAuth2, but PKCE support unverified |

## Sources

### Official Documentation
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) - Official PWA documentation
- [Serwist Documentation](https://serwist.pages.dev/docs/next/getting-started) - Getting started guide
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - Realtime features documentation
- [RegattaCentral API v4](https://api.regattacentral.com/v4/apiV4.jsp) - API documentation
- [RegattaCentral API Cookbook](https://api.regattacentral.com/v4/RegattaCentral_APIV4_Cookbook.pdf) - OAuth2 examples

### Library References
- [web-push GitHub](https://github.com/web-push-libs/web-push) - Node.js Web Push library
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper documentation
- [react-oauth2-code-pkce](https://github.com/soofstad/react-oauth2-pkce) - OAuth2 PKCE for React

### Browser Compatibility
- [Background Sync API Support](https://caniuse.com/background-sync) - ~80% global coverage
- [Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) - Browser push support

### Best Practices
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Realtime optimization
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview) - Cache patterns
