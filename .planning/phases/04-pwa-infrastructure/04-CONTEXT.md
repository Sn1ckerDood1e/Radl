# Phase 4: PWA Infrastructure - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The application works offline with cached data, sends push notifications for schedule changes, and syncs changes when reconnected. Athletes can view their schedule offline. Coaches can view schedules and lineups offline. The app can be installed as a PWA.

</domain>

<decisions>
## Implementation Decisions

### Offline Data Scope

**Athletes:**
- Cache schedule only (practice dates/times) for the upcoming 2 weeks
- Lineups are NOT cached for athletes (they check schedule, not detailed assignments)

**Coaches:**
- Cache schedules + lineups for upcoming 2 weeks
- Roster and equipment lists are NOT cached (requires online for lineup editing)
- Full offline editing is out of scope — coaches can VIEW offline, not EDIT

**Staleness handling:**
- Display cached data with "Last updated X ago" indicator
- Show warning badge when data is stale (e.g., older than 24 hours)
- Never block access due to staleness — always show what's available

### Notification Triggers

**Athletes receive notifications for:**
- Lineup assignment (when added to a practice lineup)
- Practice changes (time, location, or significant updates)
- Practice cancellations

**Notification preferences:**
- Claude's discretion on whether to offer category toggles or single on/off
- Lean toward simple (all or nothing) unless research suggests otherwise

**Coaches:**
- Claude's discretion on coach notifications
- Reasonable set: new athlete joins team, invitation accepted, damage reports filed

**Timing:**
- Claude's discretion on immediate vs batched delivery
- Consider batching for rapid changes (coach editing lineup multiple times)

### Install & Update UX

**Installation:**
- Show install banner on first visit for new users
- Banner placement: Claude's discretion (top banner or bottom sheet)
- Banner should be dismissible, don't nag if user declines

**Updates:**
- Auto-update silently in background
- New version activates on next visit (no interruption)
- No "update available" prompt unless critical

**Offline indicator:**
- Only show when action fails due to offline status
- No persistent "you're offline" banner — let user discover naturally
- When showing, include what action failed and offer retry

### Claude's Discretion
- Install banner placement (top vs bottom)
- Notification batching strategy
- Coach notification categories
- Notification preference UI complexity (toggles vs single switch)
- Service worker caching strategy details
- IndexedDB schema design

</decisions>

<specifics>
## Specific Ideas

- Keep offline footprint minimal — athletes just need to know when/where practice is
- "Last updated X ago" indicator should be subtle, not alarming
- Don't interrupt users with update prompts — silent updates preferred
- Offline failures should clearly explain what happened and offer to retry when online

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-pwa-infrastructure*
*Context gathered: 2026-01-21*
