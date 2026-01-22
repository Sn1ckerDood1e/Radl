---
phase: 04-pwa-infrastructure
plan: 04
subsystem: pwa
tags: [web-push, vapid, push-notifications, supabase-edge-functions, service-worker]

# Dependency graph
requires:
  - phase: 04-01
    provides: Service worker infrastructure with Serwist
provides:
  - PushSubscription database model for storing Web Push subscriptions
  - API endpoints for subscribe/unsubscribe operations
  - Client-side subscription helper functions
  - Supabase Edge Function for sending push notifications
  - Service worker push and notificationclick handlers
affects: [04-06-push-notification-triggers, 05-regatta-mode]

# Tech tracking
tech-stack:
  added: [web-push (Edge Function)]
  patterns: [VAPID authentication, Web Push Protocol, Edge Function notification dispatch]

key-files:
  created:
    - prisma/schema.prisma (PushSubscription model)
    - src/app/api/push/subscribe/route.ts
    - src/app/api/push/unsubscribe/route.ts
    - src/lib/push/vapid.ts
    - src/lib/push/subscribe.ts
    - supabase/functions/send-notification/index.ts
  modified:
    - src/app/sw.ts (push/notificationclick handlers)
    - .env.example (VAPID placeholders)

key-decisions:
  - "VAPID keys required for Web Push Protocol encryption"
  - "Subscription endpoint is unique constraint for upsert pattern"
  - "Supabase Edge Function handles notification dispatch (separate from Next.js)"
  - "410 Gone responses trigger automatic subscription cleanup"

patterns-established:
  - "Web Push subscription flow: permission -> subscribe -> store on server"
  - "Edge Function for push dispatch (avoids server-side web-push in Next.js)"
  - "Team-scoped notifications via teamId on PushSubscription"

# Metrics
duration: ~25min
completed: 2026-01-21
---

# Phase 4 Plan 4: Push Notification Infrastructure Summary

**VAPID-authenticated Web Push subscription system with database storage, client helpers, and Supabase Edge Function for notification dispatch**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-01-21
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files created:** 6
- **Files modified:** 2

## Accomplishments

- PushSubscription model added to Prisma schema with team-scoped indexes
- Subscribe/unsubscribe API endpoints with VAPID configuration check
- Client-side helpers for browser push subscription management
- Supabase Edge Function ready to send notifications to subscribed users
- Service worker handles push events and notification clicks

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PushSubscription model and VAPID env placeholders** - `21da6c9` (feat)
2. **Task 2: Create push subscription API endpoints** - `902a401` (feat)
3. **Task 3: Create client subscription helper** - `4c8cc72` (feat)
4. **Task 4: Add Supabase Edge Function and SW push handlers** - `bad8a09` (refactor)

## Files Created/Modified

**Created:**
- `prisma/schema.prisma` - PushSubscription model with userId, teamId, endpoint, p256dh, auth fields
- `src/app/api/push/subscribe/route.ts` - POST endpoint to store push subscriptions with upsert
- `src/app/api/push/unsubscribe/route.ts` - POST endpoint to remove subscriptions
- `src/lib/push/vapid.ts` - VAPID key configuration and validation
- `src/lib/push/subscribe.ts` - Client-side helpers: isPushSupported, subscribeToPush, unsubscribeFromPush, getCurrentSubscription
- `supabase/functions/send-notification/index.ts` - Edge Function for sending notifications via web-push

**Modified:**
- `src/app/sw.ts` - Added push and notificationclick event handlers
- `.env.example` - Added VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT placeholders

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| VAPID keys required | Web Push Protocol requires VAPID for encrypted push messages |
| Unique endpoint constraint | Browser endpoints are unique, enables upsert pattern on re-subscribe |
| Team-scoped subscriptions | Enables sending notifications to specific teams (e.g., practice updates) |
| Supabase Edge Function for dispatch | Avoids web-push dependency in Next.js, runs closer to database |
| 410 Gone auto-cleanup | Invalid subscriptions automatically removed when push fails |

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**VAPID keys must be configured for push notifications to work.**

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys --json
   ```

2. Add to `.env.local`:
   ```
   VAPID_PUBLIC_KEY=<generated-public-key>
   VAPID_PRIVATE_KEY=<generated-private-key>
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-public-key>
   VAPID_SUBJECT=mailto:your-email@example.com
   ```

3. Run database migration:
   ```bash
   npx prisma db push
   ```

4. (Optional) Deploy Edge Function:
   ```bash
   supabase functions deploy send-notification
   ```
   Then add VAPID keys to Supabase function secrets.

## API Reference

### POST /api/push/subscribe

Store a push subscription for the authenticated user.

**Request body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  },
  "expirationTime": null
}
```

**Response:** `{ "success": true, "id": "uuid" }`

### POST /api/push/unsubscribe

Remove a push subscription.

**Request body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/..."
}
```

**Response:** `{ "success": true }`

## Client Helper Usage

```typescript
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  getNotificationPermission
} from '@/lib/push/subscribe';

// Check support
if (isPushSupported()) {
  // Check current permission
  const permission = getNotificationPermission();

  // Subscribe (requests permission if needed)
  const subscription = await subscribeToPush();

  // Check existing subscription
  const existing = await getCurrentSubscription();

  // Unsubscribe
  await unsubscribeFromPush();
}
```

## Next Phase Readiness

- Push infrastructure complete, ready for notification triggers (Plan 04-06)
- Edge Function deployed but needs triggers (practice changes, lineup assignments)
- NotificationType enum extended with LINEUP_ASSIGNMENT, PRACTICE_CHANGE, PRACTICE_CANCELLED, ATHLETE_JOINED

---
*Phase: 04-pwa-infrastructure*
*Completed: 2026-01-21*
