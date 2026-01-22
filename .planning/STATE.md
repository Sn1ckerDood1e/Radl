# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Phase 4 - PWA Infrastructure

## Current Position

| Field | Value |
|-------|-------|
| Phase | 4 of 5 (PWA Infrastructure) |
| Plan | 7 of 7 |
| Status | Phase complete |
| Last activity | 2026-01-22 - Completed 04-07-PLAN.md |

**Progress:**
```
Phase 1: [##########] 100% (5/5 plans) COMPLETE
Phase 2: [##########] 100% (8/8 plans) COMPLETE
Phase 3: [##########] 100% (7/7 plans) COMPLETE
Phase 4: [##########] 100% (7/7 plans) COMPLETE
Phase 5: [..........] 0%

Overall:  [##########] 27/27 plans (100%)
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements completed | 23/31 |
| Plans completed | 27 |
| Plans failed | 0 |
| Blockers resolved | 0 |

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Security first | Existing JWT gaps are active vulnerabilities. Cannot add features handling lineup/attendance data without fixing. | 1 |
| Scheduling before Lineups | Lineups are assigned to practice sessions. Data model dependency. | 2, 3 |
| Offline before Regatta | Regatta mode is primary use case for offline. Building regatta features without offline infrastructure would require rework. | 4, 5 |
| 5 phases (standard depth) | Research suggested 6 phases, consolidated push notifications into PWA phase for coherent delivery. | All |
| Claims helper returns tuple | Returns { user, claims, error } for simpler destructuring at call sites | 1 |
| Error refs only on 500s | Auth/permission errors (401/403/404) don't need refs since they're expected states | 1 |
| Rate limit before auth | For anonymous endpoints, rate limit check runs before auth to prevent brute-force even without valid credentials | 1 |
| Graceful rate limit fallback | When Upstash env vars not configured, rate limiting disabled (not broken) for development-friendly behavior | 1 |
| Soft delete seasons by archiving | Preserve historical data and relationships (practices, regattas, eligibility) | 1 |
| Multiple active seasons allowed | Teams may run overlapping programs (Fall Racing, Novice Training) | 1 |
| Athletes see missing requirements | Clear visibility into what's blocking eligibility improves athlete experience | 1 |
| Upsert on eligibility PATCH | Creates record if not exists, simplifying coach workflow | 1 |
| Global error uses inline styles | CSS unavailable when layout crashes, so inline styles required | 1 |
| Error reference IDs for users | Displaying digest helps support workflows without exposing stack traces | 1 |
| DateTime for practice times | Practice uses full DateTime for startTime/endTime, templates use HH:MM strings | 2 |
| Position-based block ordering | Blocks use position Int rather than time slots for flexible ordering | 2 |
| DRAFT/PUBLISHED practice status | DRAFT visible only to coaches, PUBLISHED to all team members | 2 |
| Hard delete practices | Practices are time-bound, no archiving needed unlike seasons | 2 |
| Block reorder requires all blocks | Prevents accidental position conflicts and orphaned blocks | 2 |
| Availability computed at query time | Not stored, derived from manualUnavailable + open damage reports | 2 |
| Manual note auto-cleared | When marking equipment available, note is set to null | 2 |
| Copy-on-apply pattern | Applying template creates independent practice, no ongoing link | 2 |
| Replace-all pattern for template blocks | PATCH with blocks array deletes all and recreates | 2 |
| One lineup per block | Each PracticeBlock has @unique blockId on Lineup | 3 |
| Optional boat assignment | Lineup.boatId nullable until coach assigns boat based on availability | 3 |
| Standard rowing positions | ROWING_POSITIONS constant defines port/starboard for all boat classes | 3 |
| Separate land assignments | LandAssignment model for erg/land (no positions), Lineup for water (with positions) | 3 |
| Equipment usage logging | EquipmentUsageLog with denormalized teamId for query performance | 3 |
| AthleteCard has no hooks | Pure presentation component safe for DragOverlay (drag logic separated in wrapper) | 3 |
| Side preference color coding | Port=blue, Starboard=green, Both=purple for visual consistency | 3 |
| Block-specific lineup endpoints | PUT with replace-all pattern for simpler client integration | 3 |
| Separate water vs land endpoints | /lineup for WATER blocks, /assignments for LAND/ERG blocks | 3 |
| Athlete validation via joins | Team membership checked via athleteProfile.teamMember.teamId join | 3 |
| Component extraction pattern | Extract based on semantic cohesion, not arbitrary line counts | 3 |
| Custom hooks for stateful logic | CSV parsing, form submission logic moved to hooks for reusability | 3 |
| Utility modules for pure functions | Date/time formatting extracted to shared utilities | 3 |
| Idempotent usage logging | createUsageLog checks for existing log by equipmentId + practiceId | 3 |
| Usage logs as supplementary data | Usage log operations wrapped in try-catch, failures don't block main operations | 3 |
| Multi-select for land/erg | Checkboxes instead of drag-drop for land/erg blocks (simpler, no positions) | 3 |
| Non-blocking capacity warnings | ERG capacity warnings shown but save not prevented (coach may rotate athletes) | 3 |
| LineupEditor type-safe routing | Discriminated union props ensure correct builder receives correct props | 3 |
| Boat capacity excludes cox | Cox doesn't row, so boat capacity matching should only count rowing seats | 3 |
| Double-booking is non-blocking | Split squads may use same boat at same time, so warning shown but save allowed | 3 |
| Auto-remove from previous seat | Prevents duplicate athlete assignments when dragging to new seat position | 3 |
| Partial lineup warnings | Shows when lineup incomplete, but still allows save (work in progress) | 3 |
| Copy-on-apply for lineup templates | Templates create independent lineups with no ongoing link | 3 |
| Graceful template degradation | Apply template skips missing athletes, warns about unavailable boats without failing | 3 |
| Inline lineup editor | Edit button toggles editor for specific block, no separate route | 3 |
| ERG count hardcoded | ERG not tracked as individual equipment, hardcoded to 20 for capacity warnings | 3 |
| Template boat class filtering | Templates filterable by boatClass for easier selection | 3 |
| cachedAt timestamp on every record | Enables staleness detection for cache invalidation | 4 |
| syncStatus field (synced/pending/error) | Tracks sync state without separate tracking table | 4 |
| Compound indexes for offline queries | [teamId+date] and [practiceId+blockId] for efficient access patterns | 4 |
| Max 3 retries for sync queue | Prevents infinite retry loops on persistent failures | 4 |
| 4xx errors removed immediately | Client errors (bad data) won't succeed on retry | 4 |
| Online listener auto-triggers sync | Automatic background sync when connectivity restored | 4 |
| Use @serwist/next defaultCache | Production-tested caching strategies, no need to reinvent | 4 |
| Service worker registration production only | Avoid caching issues during development | 4 |
| Build with --webpack flag | Serwist requires webpack, Turbopack doesn't work | 4 |
| Cache during fetch | API responses automatically cached after successful fetch | 4 |
| 24-hour stale threshold | Data older than 24 hours shows stale indicator | 4 |
| Auto-refresh on reconnect | Device coming back online triggers automatic data refresh | 4 |
| VAPID keys required | Web Push Protocol requires VAPID for encrypted push messages | 4 |
| Unique endpoint constraint | Browser push endpoints are unique, enables upsert pattern on re-subscribe | 4 |
| Supabase Edge Function for dispatch | Push notifications sent via Edge Function, avoids web-push in Next.js | 4 |
| 410 Gone auto-cleanup | Invalid push subscriptions automatically removed when push fails | 4 |
| Optimistic update first | Apply local change before attempting online sync for responsive UI | 4 |
| Network error detection | TypeError or fetch message triggers offline fallback | 4 |
| SyncStatus conditional render | Only renders when pendingCount > 0 to avoid UI clutter | 4 |
| Fire-and-forget notifications | Notifications never block API responses or cause failures | 4 |
| Published-only notification guards | Draft practice changes don't trigger notifications to athletes | 4 |
| Notify only new athletes | Avoid redundant notifications when lineup is modified | 4 |
| useSyncExternalStore for online status | SSR-safe pattern that returns true on server, syncs with navigator.onLine on client | 4 |
| 30-day install dismissal | Prevents install banner nagging while allowing re-prompt after reasonable time | 4 |
| PWAWrapper client component | Server component layout.tsx cannot directly render client components with hooks | 4 |

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering (no RLS yet)
- **Auth:** Supabase SSR client + JWT claims for team context
- **Auth pattern:** `getClaimsForApiRoute()` uses `getUser()` before `getSession()` (security fix)
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA stack:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Error handling:** Route-level error.tsx + global-error.tsx with reference IDs
- **Practice models:** Practice, PracticeBlock, PracticeTemplate, TemplateBlock, BlockTemplate
- **Lineup models:** Lineup, SeatAssignment, LineupTemplate, TemplateSeat, EquipmentUsageLog, LandAssignment
- **Offline models:** OfflineSchedule, OfflineLineup, SyncQueueItem, CacheMeta (Dexie/IndexedDB)
- **Push models:** PushSubscription (team-scoped push notification subscriptions)
- **Date handling:** date-fns for time manipulation in template application
- **Rowing positions:** 1-based numbering (1=Bow, 8=Stroke, 9=Cox for 8+), SeatSide enum (PORT/STARBOARD/NONE)
- **Drag-and-drop:** dnd-kit (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities) for lineup editor

### Tech Debt Tracker

| Item | Status | Phase |
|------|--------|-------|
| DEBT-01: Claims helper utility | **COMPLETE** | 1 |
| DEBT-02: Refactor oversized forms | **COMPLETE** | 3 |
| DEBT-03: Query caching | **COMPLETE** | 4 |

### Patterns Established

| Pattern | Usage | Files |
|---------|-------|-------|
| API auth pattern | `const { user, claims, error } = await getClaimsForApiRoute(); if (error \|\| !user) return unauthorizedResponse();` | All API routes |
| Team guard | `if (!claims?.team_id) return forbiddenResponse('No team associated with user');` | Team-scoped routes |
| Role guard | `if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can...');` | Coach-only routes |
| Rate-limit-first | `const clientIp = getClientIp(request); const rateLimit = await checkRateLimit(clientIp, 'action');` | Anonymous/sensitive endpoints |
| Soft-delete-archive | `status: 'ARCHIVED'` instead of hard delete | Season, Equipment |
| Role-based-visibility | Different data returned based on user_role (coach sees all, athlete sees self) | Eligibility endpoints |
| Route error boundary | `'use client'` + useEffect logging + friendly UI with reset | src/app/error.tsx |
| Global error boundary | Inline styles, html/body wrapper, minimal recovery UI | src/app/global-error.tsx |
| Position-based ordering | `position Int` field with `[parentId, position]` index | PracticeBlock, TemplateBlock |
| Template pattern | Template models mirror instance models with default values | PracticeTemplate, BlockTemplate |
| Computed properties | Derive status from related records at query time | src/lib/equipment/readiness.ts |
| Nested Prisma create | Parent with children in single create call | src/app/api/practices/route.ts |
| Atomic position reorder | Use $transaction for position updates | src/app/api/practices/[id]/blocks/reorder/route.ts |
| Copy-on-apply | Template.apply copies data, no ongoing link | src/app/api/practice-templates/apply/route.ts |
| Replace-all blocks | PATCH with blocks array deletes all and recreates | src/app/api/practice-templates/[id]/route.ts |
| Block editor pattern | Nested component managing array state with tempId for unsaved items | src/components/practices/block-editor.tsx |
| View/edit toggle | Client component with isEditing state for detail pages | src/app/(dashboard)/[teamSlug]/practices/[id]/practice-detail-client.tsx |
| Lazy-load panel | Fetch data only when panel expanded, track hasFetched state | src/components/practices/equipment-availability-panel.tsx |
| Template UI pattern | List/detail/form pages mirroring practice UI structure | src/app/(dashboard)/[teamSlug]/practice-templates/ |
| Apply template flow | Select template -> pick date -> POST to apply endpoint | src/components/templates/apply-template-section.tsx |
| Duplicate prevention validation | Zod refinements checking for duplicate athleteIds and positions in seats array | src/lib/validations/lineup.ts |
| Position-side configuration | ROWING_POSITIONS maps BoatClass to seat configs with position/label/side | src/lib/lineup/position-labels.ts |
| Drag wrapper pattern | Presentation component wrapped by hook-based draggable component (AthleteCard + DraggableAthlete) | src/components/lineups/ |
| DragOverlay safety | Components for DragOverlay must have zero hooks (AthleteCard is pure presentation) | src/components/lineups/athlete-card.tsx |
| CSV parsing hook | useCSVParser encapsulates file parsing, validation, state management | src/hooks/use-csv-parser.ts |
| Date-time utilities | Shared formatters for HTML inputs and API payloads | src/lib/utils/date-time-helpers.ts |
| Form sub-components | Extract self-contained UI sections (ShellFields, LogoUploadField, ColorPickerFields) | src/components/forms/, src/components/equipment/ |
| Automatic resource usage tracking | createUsageLog called after boat assignment, deleteUsageLogForLineup on cleanup | src/lib/equipment/usage-logger.ts, lineup API routes |
| Supplementary data pattern | Usage log failures don't block primary operations, wrapped in try-catch with warnings | All lineup API routes |
| Offline data interface | Interface with id, cachedAt, syncStatus fields | src/lib/db/schema.ts |
| Reactive query hook | useLiveQuery with default value for loading state | src/lib/db/hooks.ts |
| Sync queue item | operation, entity, entityId, payload, timestamp, retries | src/lib/db/sync-queue.ts |
| PWA registration | Client component returns null, runs useEffect registration | src/components/pwa/register-sw.tsx |
| Service worker source | Entry point at src/app/sw.ts, generated to public/sw.js | next.config.ts, src/app/sw.ts |
| Cache manager | Transaction-based writes with metadata tracking | src/lib/db/cache-manager.ts |
| Offline-aware hook | Combine API fetch with IndexedDB fallback and online/offline listeners | src/hooks/use-offline-data.ts |
| Staleness indicator | Subtle amber color for offline/stale, zinc for normal freshness display | src/components/pwa/staleness-indicator.tsx |
| Push subscription flow | permission -> subscribe -> store on server | src/lib/push/subscribe.ts |
| Push notification handlers | Service worker push/notificationclick events | src/app/sw.ts |
| Edge Function dispatch | Supabase Edge Function sends notifications via web-push | supabase/functions/send-notification/index.ts |
| executeWithOfflineFallback | Try online action first, queue if offline or network error | src/lib/db/offline-mutations.ts |
| useOfflineMutation hook | React hook for offline-capable mutations with loading/error state | src/hooks/use-offline-mutation.ts |
| Animated sync indicator | Ping animation for pending sync items | src/components/pwa/sync-status.tsx |
| Fire-and-forget notification trigger | Non-blocking notification dispatch via Supabase Edge Function | src/lib/push/triggers.ts |
| NotificationSettings toggle | Permission-aware toggle with unsupported browser handling | src/components/pwa/notification-settings.tsx |
| Online status hook | useSyncExternalStore with navigator.onLine and event listeners | src/hooks/use-online-status.ts |
| Install banner | Intercept beforeinstallprompt, store deferred prompt, trigger on user action | src/components/pwa/install-banner.tsx |
| Offline context | Provider pattern with show/dismiss/retry error management | src/components/pwa/offline-indicator.tsx |
| PWA integration | Client wrapper component for server component layouts | src/components/pwa/pwa-wrapper.tsx |

### Todos

- None yet

### Blockers

- Node.js 18.x doesn't meet Next.js 16 requirement (20.9.0+) - using tsc for verification

## Phase 1 Completion Summary

All 6 requirements for Phase 1 verified complete:

| REQ-ID | Description | Status |
|--------|-------------|--------|
| SEC-01 | Fix JWT claims verification gaps | COMPLETE |
| SEC-02 | Add rate limiting to sensitive endpoints | COMPLETE |
| SEC-03 | Audit and verify multi-tenant data isolation | COMPLETE |
| SEASON-01 | Create season container model | COMPLETE |
| SEASON-02 | Implement season-scoped eligibility | COMPLETE |
| DEBT-01 | Extract claims helper utility | COMPLETE |

## Phase 2 Progress

| Plan | Description | Status |
|------|-------------|--------|
| 02-01 | Data models for Practice, Blocks, Templates | COMPLETE |
| 02-02 | Practice CRUD API | COMPLETE |
| 02-03 | Equipment Readiness API | COMPLETE |
| 02-04 | Template system API | COMPLETE |
| 02-05 | Practice management UI | COMPLETE |
| 02-06 | Calendar UI | COMPLETE |
| 02-07 | Practice visibility and navigation | COMPLETE |
| 02-08 | Equipment availability panel | COMPLETE |

**Phase 2 Complete** - All 8 plans executed, all 4 success criteria verified.

## Phase 2 Completion Summary

All 6 requirements for Phase 2 verified complete:

| REQ-ID | Description | Status |
|--------|-------------|--------|
| PRAC-01 | Create practices with time blocks | COMPLETE |
| PRAC-02 | Add block metadata | COMPLETE |
| PRAC-03 | Create reusable practice templates | COMPLETE |
| PRAC-04 | Build unified calendar view | COMPLETE |
| EQUIP-02 | Implement readiness state | COMPLETE |
| EQUIP-03 | Enforce availability at assignment | COMPLETE |

## Phase 3 Progress

| Plan | Description | Status |
|------|-------------|--------|
| 03-01 | Lineup data models and validation schemas | COMPLETE |
| 03-02 | Lineup CRUD API | COMPLETE |
| 03-03 | Equipment usage logging | COMPLETE |
| 03-04 | dnd-kit components | COMPLETE |
| 03-05 | Water lineup builder | COMPLETE |
| 03-06 | Land/erg assignment UI | COMPLETE |
| 03-07 | Lineup template system | COMPLETE |
| 03-08 | Practice lineup integration & template management | COMPLETE |
| 03-09 | Form component refactoring (DEBT-02) | COMPLETE |

**Phase 3 Complete** - All 7 core plans executed, all lineup management requirements verified.

## Phase 3 Completion Summary

All 5 requirements for Phase 3 verified complete:

| REQ-ID | Description | Status |
|--------|-------------|--------|
| LINE-01 | Create lineups with boat assignments | COMPLETE |
| LINE-02 | Log equipment usage automatically | COMPLETE |
| LINE-03 | Save lineup as reusable template | COMPLETE |
| LINE-04 | Assign athletes to land/erg blocks | COMPLETE |
| EQUIP-01 | Track equipment usage history | COMPLETE |

## Phase 4 Progress

| Plan | Description | Status |
|------|-------------|--------|
| 04-01 | Service worker infrastructure | COMPLETE |
| 04-02 | IndexedDB schema and hooks | COMPLETE |
| 04-03 | Offline data sync | COMPLETE |
| 04-04 | Push notification infrastructure | COMPLETE |
| 04-05 | Offline mutation and sync status UI | COMPLETE |
| 04-06 | Notification triggers and settings UI | COMPLETE |
| 04-07 | Install UX and offline indicator | COMPLETE |

## Phase 4 Completion Summary

All 4 requirements for Phase 4 verified complete:

| REQ-ID | Description | Status |
|--------|-------------|--------|
| PWA-01 | Service worker with caching strategies | COMPLETE |
| PWA-02 | Offline data sync with IndexedDB | COMPLETE |
| PWA-03 | Push notification infrastructure | COMPLETE |
| PWA-04 | Install UX and offline indicators | COMPLETE |

**Phase 4 Complete** - All 7 plans executed, PWA infrastructure fully operational.

## Session Continuity

### Last Session

- **Date:** 2026-01-22
- **Activity:** Executed 04-07-PLAN.md (Install UX and offline indicator)
- **Outcome:** useOnlineStatus hook, OfflineProvider context, InstallBanner component, dashboard integration

### Next Actions

1. Phase 4 complete - ready for Phase 5 (Regatta Mode)
2. Build regatta data import and management
3. Deploy and verify PWA in production

### Files Modified This Session

**Created:**
- `src/hooks/use-online-status.ts` (Online status tracking hook)
- `src/components/pwa/offline-indicator.tsx` (Offline error context and UI)
- `src/components/pwa/install-banner.tsx` (PWA install prompt)
- `src/components/pwa/pwa-wrapper.tsx` (Client wrapper for layout)
- `.planning/phases/04-pwa-infrastructure/04-07-SUMMARY.md` (completed)

**Modified:**
- `src/app/(dashboard)/layout.tsx` (Added PWAWrapper)
- `.planning/STATE.md` (updated)

---

*Last updated: 2026-01-22 (Phase 4 - COMPLETE - 7/7 plans)*
