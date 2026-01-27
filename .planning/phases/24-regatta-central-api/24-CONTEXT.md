# Phase 24: Regatta Central Public API — Context

## Phase Goal
Integrate RC public API to display upcoming regatta schedules

## Decisions

### Regatta Display UI

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Location | Integrated with practices/scheduling | Regattas are part of the team's schedule, not separate |
| Information shown | Name, date, location, RC link | Core info athletes need; full details on RC site |
| Missing data handling | Hide incomplete | Only show regattas with complete info |

**Key insight:** Regattas should feel like part of the schedule, not a separate feature.

### Calendar Integration

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual styling | Different color | Distinct from practices (e.g., blue vs emerald) |
| Click behavior | Show details card | Popup with info + link to RC for full details |
| Multi-day events | Spanning bar | Visual bar across multiple days in calendar |

**Key insight:** Regattas need to be visually distinct but integrated into the calendar view.

### Caching & Reliability

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cache TTL | 6 hours | Balances freshness with API rate limits |
| API unavailable | Show stale data | Display cached data with "Last updated" timestamp |

**Key insight:** Reliability over freshness — users should always see something.

### Data Filtering

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Date range | Current season | Match team's active season dates |
| Region filter | User-configurable | Team settings to choose regions of interest |

**Key insight:** Relevant filtering reduces noise; season-scoped keeps focus on what matters.

## UI Specifications

### Calendar View
- Regattas appear as distinct color (blue) entries
- Multi-day regattas show as spanning bar across days
- Click opens details card with:
  - Regatta name
  - Date range
  - Location
  - "View on Regatta Central" link

### Practices List Integration
- Regattas appear in chronological order with practices
- Visually distinct (color/icon) from practice entries
- Same info: name, date, location, RC link

### Team Settings
- New "Regatta Regions" section
- Multi-select for regions of interest
- Applied as filter when fetching regattas

## Technical Constraints

- RC public API endpoint (no OAuth needed for public data)
- 6-hour server-side cache with stale-while-revalidate
- Filter to current season dates + configured regions
- Hide entries with missing required fields (name, date, location)

## Out of Scope

- Team-specific OAuth integration (future milestone)
- Registration status tracking
- Distance calculation from team location
- Dedicated /regattas page (integrated into schedule instead)
