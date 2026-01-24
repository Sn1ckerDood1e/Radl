---
phase: 15-mobile-pwa-improvements
created: 2026-01-24
status: ready-to-plan
---

# Phase 15: Mobile PWA Improvements — Context

## Phase Goal

Application provides native-app-quality mobile experience with offline-first architecture.

## Current State Analysis

| Aspect | Status |
|--------|--------|
| PWA basics | Already working (Serwist service worker, manifest) |
| Offline storage | Dexie.js IndexedDB already set up |
| Responsive CSS | Mobile styles exist but inconsistent |
| Touch targets | 44px minimum added in Phase 14 |
| Gestures | Not implemented |
| Bottom sheets | Not implemented |
| Network indicator | Basic SyncStatus exists in header |

### Existing Infrastructure

From Phase 14:
- shadcn/ui components with mobile-responsive variants
- CSS touch target enforcement (44px on mobile)
- Theme system working on mobile

From v1.0:
- Service worker with Serwist
- IndexedDB via Dexie.js for offline data
- PWA manifest with icons
- Basic offline page

## Decisions Made

### Decision 1: Offline Mutation Handling

**Choice:** Queue all changes automatically

**Rationale:**
- Users expect seamless editing regardless of connectivity
- Manual sync buttons feel dated
- Automatic sync on reconnect matches native app behavior

**Implementation:**
- Store mutations in IndexedDB queue
- Sync automatically when connectivity returns
- Use existing Dexie.js infrastructure

### Decision 2: Conflict Resolution

**Choice:** Last-write-wins

**Rationale:**
- Simple, predictable behavior
- Rowing teams rarely have true conflicts (coach usually sole editor)
- Avoids complex merge UI
- Acceptable data loss risk for this domain

**Implementation:**
- Timestamp all mutations
- Server accepts most recent write
- No conflict prompts to user

### Decision 3: Offline Cache Scope

**Choice:** Today + upcoming only

**Rationale:**
- Minimal storage footprint
- Covers primary use case (checking today's practice)
- Historical data less critical for mobile field use
- Reduces sync time and battery impact

**Implementation:**
- Cache: today's practices, this week's schedule, current lineups
- Roster for current club (needed for lineup display)
- Equipment assigned to cached practices

### Decision 4: Swipe Gesture Coverage

**Choice:** All list items support swipe gestures

**Rationale:**
- Consistent interaction model across app
- Standard mobile UX pattern
- Reduces learning curve

**Implementation:**
- Swipe LEFT → Delete (red, destructive)
- Swipe RIGHT → Edit (gray/blue)
- Applies to: practices, equipment, roster, lineups
- All destructive swipes require confirmation dialog

### Decision 5: Bottom Sheet Triggers

**Choice:** Mobile only (<768px breakpoint)

**Rationale:**
- Desktop users expect traditional dropdowns
- Mobile users expect bottom sheets
- Breakpoint aligns with existing mobile CSS
- No touch detection needed (simpler)

**Implementation:**
- Context menus → bottom sheet on mobile
- Action menus → bottom sheet on mobile
- Desktop retains shadcn DropdownMenu
- Dismiss via: tap backdrop or swipe down

### Decision 6: Bottom Sheet Style

**Choice:** Match existing theme (not iOS or Material specific)

**Rationale:**
- Consistent with design system from Phase 14
- Uses existing surface colors and border radius
- Avoids platform-specific styling

**Implementation:**
- Use --surface-2 background
- Standard border radius from theme
- Drag handle at top
- Backdrop blur optional (Claude discretion)

### Decision 7: Network Indicator Location

**Choice:** Header bar, visible only when offline/issues

**Rationale:**
- Always accessible location
- Minimal when things work (clean UI)
- Prominent when attention needed
- Aligns with existing header pattern

**Implementation:**
- Hidden when online and no pending changes
- Show when: offline, syncing, pending changes, sync error
- Subtle pulse animation when pending changes
- Tappable only when issues (shows sync queue, retry option)

## Claude's Discretion

- Optimistic UI vs pending state (per action type)
- Bottom sheet snap points (single vs multi based on content)
- Exact animation timing for swipe gestures
- Backdrop blur on bottom sheets
- PWA install prompt timing and design
- View transition animation specifics

## Success Criteria Mapping

| Criteria | Approach |
|----------|----------|
| Mobile breakpoints (320/375/414px) | CSS responsive testing, no specific decisions needed |
| 44px touch targets | Already done in Phase 14 |
| Offline mutations queue + sync | Auto-queue, last-write-wins, today+upcoming cache |
| Network connectivity indicator | Header-based, minimal (offline only), tappable when issues |
| Swipe gestures | All lists, left=delete, right=edit, confirmation required |
| PWA install prompt | Claude discretion on timing/design |
| Bottom sheets on mobile | <768px, theme-matched, tap/swipe dismiss |
| View transitions | Claude discretion on animation approach |

## Out of Scope

- Push notifications (deferred to future milestone)
- Native app development (v2.0 is PWA only)
- Complex merge conflict UI (using last-write-wins)
- Offline-first for historical data (today+upcoming only)

## Dependencies

- Phase 14 complete (provides shadcn/ui components, touch targets)
- Existing Serwist + Dexie.js infrastructure

## Risks

| Risk | Mitigation |
|------|------------|
| Last-write-wins loses data | Acceptable for rowing domain; revisit if user complaints |
| Gesture library bundle size | Use @use-gesture/react (already in STATE.md) |
| Bottom sheet z-index conflicts | Integrate with existing dialog patterns |

---

*Phase: 15-mobile-pwa-improvements*
*Context gathered: 2026-01-24*
