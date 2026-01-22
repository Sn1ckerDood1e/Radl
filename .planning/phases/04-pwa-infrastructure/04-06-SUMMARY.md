---
phase: 04-pwa-infrastructure
plan: 06
subsystem: pwa
tags: [push-notifications, notification-triggers, fire-and-forget, notification-settings]

# Dependency graph
requires:
  - phase: 04-04
    provides: Push notification infrastructure (PushSubscription model, subscribe/unsubscribe endpoints, Edge Function)
provides:
  - Notification trigger functions for lineup assignments and practice changes
  - Non-blocking notification dispatch from API routes
  - User-facing notification settings UI with toggle
affects: [05-regatta-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget notifications, Supabase Edge Function invocation from Next.js]

key-files:
  created:
    - src/lib/push/triggers.ts
    - src/components/pwa/notification-settings.tsx
  modified:
    - src/app/api/practices/[id]/route.ts
    - src/app/api/lineups/[id]/route.ts
    - src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts
    - src/app/(dashboard)/[teamSlug]/settings/page.tsx

key-decisions:
  - "Fire-and-forget pattern for notifications - don't await, don't throw"
  - "Only notify on published practices - draft changes are coach-only"
  - "Only notify newly assigned athletes - avoid redundant notifications"
  - "Notification settings UI shows what types of notifications are sent"

patterns-established:
  - "Non-blocking notification trigger pattern via fire-and-forget"
  - "Published-only notification guard for practice-related events"
  - "Toggle switch component pattern for settings"

# Metrics
duration: ~5min
completed: 2026-01-22
---

# Phase 4 Plan 6: Notification Triggers Summary

**Fire-and-forget notification triggers for lineup assignments and practice changes with user-facing settings UI**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-01-22
- **Tasks:** 3 (all auto)
- **Files created:** 2
- **Files modified:** 4

## Accomplishments

- Created notification trigger functions for all key events
- Integrated triggers into lineup and practice API routes
- Built NotificationSettings component with toggle switch
- Added push notification settings section to team settings page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create notification trigger functions** - `7fe4759` (feat)
2. **Task 2: Integrate triggers into API routes** - `7a980cb` (feat)
3. **Task 3: Create notification settings UI** - `3265cbd` (feat)

## Files Created/Modified

**Created:**
- `src/lib/push/triggers.ts` - Notification trigger functions (notifyLineupAssignment, notifyPracticeChange, notifyPracticeCancelled, notifyAthleteJoined, notifyDamageReported)
- `src/components/pwa/notification-settings.tsx` - Toggle switch UI for notification preferences

**Modified:**
- `src/app/api/practices/[id]/route.ts` - PATCH notifies on date/time changes, DELETE notifies on cancellation
- `src/app/api/lineups/[id]/route.ts` - PATCH notifies newly assigned athletes
- `src/app/api/practices/[id]/blocks/[blockId]/lineup/route.ts` - PUT notifies newly assigned athletes
- `src/app/(dashboard)/[teamSlug]/settings/page.tsx` - Added Push Notifications section

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Fire-and-forget pattern | Notifications should never slow down API responses or cause failures |
| Published-only guards | Draft practices are coach-only, athletes shouldn't see draft changes |
| Notify only new athletes | Avoid redundant notifications when lineup is modified |
| Supabase functions invoke | Uses Supabase client to call Edge Function, no direct HTTP |

## Deviations from Plan

None - plan executed exactly as written.

## API Integration Points

### Notification Triggers

```typescript
import {
  notifyLineupAssignment,
  notifyPracticeChange,
  notifyPracticeCancelled,
  notifyAthleteJoined,
  notifyDamageReported,
} from '@/lib/push/triggers';

// Notify athletes added to lineup (fire-and-forget)
notifyLineupAssignment(
  teamId,
  athleteUserIds,    // string[] of user IDs to notify
  practiceName,
  practiceDate,
  practiceId
);

// Notify about practice changes
notifyPracticeChange(
  teamId,
  practiceName,
  practiceDate,
  practiceId,
  changeDescription  // e.g., "date changed, start time changed"
);

// Notify about cancellation
notifyPracticeCancelled(teamId, practiceName, practiceDate);
```

### NotificationSettings Component

```tsx
import { NotificationSettings } from '@/components/pwa/notification-settings';

// In your settings page
<NotificationSettings />
```

The component handles:
- Checking browser support for push notifications
- Displaying current permission and subscription state
- Toggle switch to enable/disable push notifications
- Helpful messaging when permissions are blocked
- List of notification types users will receive

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| Athletes notified on lineup assignment | COMPLETE |
| All team members notified on practice changes (published only) | COMPLETE |
| Team notified when practice cancelled | COMPLETE |
| Simple on/off toggle for notification preferences | COMPLETE |
| Graceful handling of unsupported browsers | COMPLETE |
| Non-blocking notification delivery | COMPLETE |

## Next Phase Readiness

- Notification system complete for lineup and practice events
- Additional triggers available (notifyAthleteJoined, notifyDamageReported) for future use
- Settings UI integrated and ready for users
- Plan 04-07 (Offline-first schedule view) is next

---
*Phase: 04-pwa-infrastructure*
*Completed: 2026-01-22*
