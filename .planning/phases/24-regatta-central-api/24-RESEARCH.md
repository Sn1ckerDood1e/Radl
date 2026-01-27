# Phase 24: Regatta Central Public API - Research

**Researched:** 2026-01-27
**Domain:** External API Integration, Server-Side Caching, Calendar UI
**Confidence:** MEDIUM

## Summary

This phase integrates the Regatta Central (RC) public API to display upcoming regatta schedules within the existing calendar/practices view. Research reveals that the RC API **requires authentication for all endpoints** - there is no truly "public" unauthenticated access. However, the codebase already has OAuth integration infrastructure (`src/lib/regatta-central/client.ts`) that can be extended for this use case.

The implementation should leverage Next.js 16's fetch caching with `next: { revalidate: 21600 }` (6 hours) for stale-while-revalidate semantics. Multi-day regatta events can be visualized using react-day-picker's custom modifiers for range styling (`range_start`, `range_middle`, `range_end`).

**Primary recommendation:** Extend the existing RC client to fetch upcoming regattas with server-side caching, create a new "regatta regions" setting field, and enhance the unified calendar to show multi-day regatta events with spanning visualization.

## Standard Stack

The codebase already has the core infrastructure for this phase.

### Core (Already Present)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 | Framework with fetch caching | Already in use, native ISR/caching |
| react-day-picker | 9.13.0 | Calendar component | Already used for unified calendar |
| date-fns | 4.1.0 | Date manipulation | Already in use throughout |
| Prisma | 6.0.0 | Database ORM | Already in use for data models |
| Zod | 4.3.5 | Validation | Already in use |

### Supporting (Already Present)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | User feedback for sync/errors |
| lucide-react | 0.562.0 | Icons | UI elements |

### No New Dependencies Required
The existing stack handles all requirements for this phase.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── regatta-central/
│       ├── client.ts              # Existing - extend with public regatta fetching
│       ├── types.ts               # Existing - add public regatta types
│       ├── encryption.ts          # Existing - no changes needed
│       └── public-regattas.ts     # NEW - public regatta fetching with caching
├── app/
│   └── api/
│       └── regattas/
│           └── upcoming/
│               └── route.ts       # NEW - cached endpoint for upcoming regattas
├── components/
│   └── calendar/
│       ├── unified-calendar.tsx   # Existing - extend for multi-day events
│       └── regatta-card.tsx       # Existing - add RC link, detail popup
└── prisma/
    └── schema.prisma              # Add regattaRegions to TeamSettings
```

### Pattern 1: Server-Side Fetch Caching
**What:** Use Next.js 16 fetch with `revalidate` option for stale-while-revalidate
**When to use:** External API calls that don't need real-time freshness

**Example:**
```typescript
// Source: Next.js 16 docs - caching-and-revalidating
// 6-hour cache with stale-while-revalidate
const response = await fetch(`${RC_API_URL}/regattas/US/upcoming`, {
  headers: { Authorization: `Bearer ${token}` },
  next: {
    revalidate: 21600, // 6 hours in seconds
    tags: ['rc-regattas', `rc-regattas-${teamId}`]
  }
});

// If API fails during revalidation, stale data continues to serve
// This is built-in Next.js behavior
```

### Pattern 2: Multi-Day Event Rendering with Custom Modifiers
**What:** Use react-day-picker modifiers to style date ranges
**When to use:** Events spanning multiple calendar days

**Example:**
```typescript
// Source: react-day-picker docs - custom-modifiers
import { DayPicker, rangeIncludesDate } from 'react-day-picker';

// Create modifiers for each regatta's date range
const regattaModifiers = regattas.reduce((acc, regatta) => {
  const range = { from: new Date(regatta.startDate), to: new Date(regatta.endDate) };

  return {
    ...acc,
    [`regatta_start_${regatta.id}`]: range.from,
    [`regatta_end_${regatta.id}`]: range.to,
    [`regatta_middle_${regatta.id}`]: (date: Date) =>
      rangeIncludesDate(range, date, true),
  };
}, {});

// Apply CSS classes for visual spanning bar
const modifiersClassNames = Object.fromEntries(
  regattas.flatMap(r => [
    [`regatta_start_${r.id}`, 'regatta-range-start'],
    [`regatta_middle_${r.id}`, 'regatta-range-middle'],
    [`regatta_end_${r.id}`, 'regatta-range-end'],
  ])
);
```

### Pattern 3: Graceful Degradation with Stale Data
**What:** Display cached data with "last updated" timestamp when API unavailable
**When to use:** Any external API integration

**Example:**
```typescript
// Source: Existing unified-calendar.tsx pattern
interface CachedRegattaData {
  regattas: RCRegatta[];
  lastUpdated: Date;
  isStale: boolean;
}

// API endpoint returns metadata alongside data
return NextResponse.json({
  regattas: data,
  lastUpdated: new Date().toISOString(),
  cacheHit: /* determined by headers or timing */
});
```

### Anti-Patterns to Avoid
- **Client-side API calls:** Never call RC API directly from browser - always server-side for token security
- **Polling for fresh data:** Use server-side revalidation, not client-side intervals
- **Blocking on API failure:** Always have fallback to cached/stale data
- **Hardcoded regions:** Use team settings for region configuration

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP caching | Custom cache layer | Next.js fetch `revalidate` | Native stale-while-revalidate, handles all edge cases |
| Token refresh | Manual expiry checking | Existing `RegattaCentralClient.refreshTokenIfNeeded()` | Already handles 10-min expiry buffer |
| Date range detection | Manual loop comparison | date-fns `isWithinInterval`, react-day-picker `rangeIncludesDate` | Handles edge cases (timezones, boundaries) |
| Offline support | Custom IndexedDB logic | Existing Dexie + regatta-cache.ts | Already have patterns for regatta caching |

**Key insight:** The codebase already has robust patterns for caching, offline support, and RC integration. Extend rather than rebuild.

## Common Pitfalls

### Pitfall 1: Assuming Public API Exists
**What goes wrong:** Documentation mentions "public" regattas but all RC endpoints require authentication
**Why it happens:** Misreading API docs or assuming "public data" means "unauthenticated access"
**How to avoid:** Use authenticated requests to `/regattas/{country}/upcoming` with existing OAuth flow
**Warning signs:** 401/403 errors, empty responses

### Pitfall 2: Calendar Range Visualization Complexity
**What goes wrong:** react-day-picker doesn't natively support "event bars" like Google Calendar
**Why it happens:** DayPicker is a date picker, not an event calendar
**How to avoid:** Use custom modifiers + CSS to create visual spanning effect, OR render multi-day events as multiple day entries with connected styling
**Warning signs:** Regattas appearing as separate unconnected dots on each day

### Pitfall 3: Stale Cache on API Error vs. Fresh Cache
**What goes wrong:** Confusing "no cache" with "stale cache" states
**Why it happens:** Next.js fetch caching has nuanced behavior
**How to avoid:**
- If API succeeds: fresh data cached
- If API fails during revalidation: previous stale data served (good!)
- If API fails on first request ever: request fails (need initial seed)
**Warning signs:** Empty states when API is down but user had previous data

### Pitfall 4: Region Filter at Wrong Layer
**What goes wrong:** Filtering regattas client-side after fetching all regions
**Why it happens:** Simpler implementation
**How to avoid:** Pass region filter to API call (`/regattas/{country}/upcoming`), cache per-region
**Warning signs:** Slow initial loads, unnecessary data transfer

### Pitfall 5: Timezone Handling for Multi-Day Events
**What goes wrong:** Regatta showing on wrong calendar days
**Why it happens:** RC timestamps in Unix ms, calendar expects local dates
**How to avoid:** Use date-fns-tz (already installed) to convert to team's timezone before date comparison
**Warning signs:** Regattas appearing day before/after expected

## Code Examples

Verified patterns from official sources and existing codebase:

### Cached Regatta Fetch (Server Action/Route Handler)
```typescript
// Source: Next.js 16 caching docs + existing RC client pattern
import { RegattaCentralClient } from '@/lib/regatta-central/client';

export async function getUpcomingRegattas(teamId: string, country: string = 'US') {
  const client = new RegattaCentralClient(teamId);

  // This fetch will be cached for 6 hours with stale-while-revalidate
  // Next.js handles the caching automatically via fetch()
  const regattas = await client.getUpcomingRegattas(country);

  return {
    regattas: regattas.regattas.filter(r =>
      // Filter to regattas with required fields
      r.name && r.startDate && r.location
    ),
    lastUpdated: new Date().toISOString(),
  };
}
```

### TeamSettings Schema Extension
```prisma
// Source: Existing prisma/schema.prisma pattern
model TeamSettings {
  // ... existing fields ...

  // Regatta regions (array of country codes or region identifiers)
  regattaRegions         String[]  @default([])  // e.g., ["US", "CAN"]

  // ... rest of model ...
}
```

### Multi-Day Event CSS for Calendar
```css
/* Source: Inspired by react-day-picker modifiers + Google Calendar */
/* Applied via global styles in unified-calendar.tsx */

.regatta-range-start .calendar-day-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  right: 0;
  height: 24px;
  transform: translateY(-50%);
  background-color: rgba(59, 130, 246, 0.3); /* blue-500 with opacity */
  border-radius: 4px 0 0 4px;
  z-index: -1;
}

.regatta-range-middle .calendar-day-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 24px;
  transform: translateY(-50%);
  background-color: rgba(59, 130, 246, 0.3);
  z-index: -1;
}

.regatta-range-end .calendar-day-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 50%;
  height: 24px;
  transform: translateY(-50%);
  background-color: rgba(59, 130, 246, 0.3);
  border-radius: 0 4px 4px 0;
  z-index: -1;
}
```

### Regatta Detail Popup Component
```typescript
// Source: Existing RegattaCard pattern + CONTEXT decisions
interface RegattaDetailPopupProps {
  regatta: {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate?: string;
    rcRegattaId?: string;
  };
  onClose: () => void;
}

export function RegattaDetailPopup({ regatta, onClose }: RegattaDetailPopupProps) {
  const rcUrl = regatta.rcRegattaId
    ? `https://www.regattacentral.com/regatta/?id=${regatta.rcRegattaId}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full mx-4 border border-zinc-700">
        <h2 className="text-lg font-semibold text-white">{regatta.name}</h2>
        <p className="text-sm text-zinc-400 mt-1">
          {format(new Date(regatta.startDate), 'MMM d')}
          {regatta.endDate && ` - ${format(new Date(regatta.endDate), 'MMM d, yyyy')}`}
        </p>
        <p className="text-sm text-zinc-400">{regatta.location}</p>

        {rcUrl && (
          <a
            href={rcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            View on Regatta Central
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        <button onClick={onClose} className="mt-4 w-full ...">Close</button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_cache` API | Cache Components with `use cache` or fetch `revalidate` | Next.js 16 | More explicit caching, prefer fetch revalidate for API calls |
| Client-side data fetching | Server Components + fetch caching | Next.js 13+ | Better performance, SEO, security |
| Custom cache invalidation | `revalidateTag()` with profiles | Next.js 16 | Stale-while-revalidate now requires `profile="max"` for SWR semantics |

**Deprecated/outdated:**
- `unstable_cache`: Replaced by Cache Components in Next.js 16, but `fetch()` with `next.revalidate` is preferred for external API calls
- Client-side polling: Replace with server-side revalidation

## Open Questions

Things that couldn't be fully resolved:

1. **RC API Rate Limits**
   - What we know: All endpoints require authentication; API docs don't specify rate limits
   - What's unclear: Exact rate limit thresholds, whether they're per-token or per-IP
   - Recommendation: Start with 6-hour cache (conservative), monitor for 429 errors, adjust if needed

2. **Region/Country Filtering Specifics**
   - What we know: Endpoint is `/regattas/{country}/upcoming` where country is ISO code
   - What's unclear: Whether regions within a country (e.g., "Northeast US") are supported
   - Recommendation: Start with country-level filtering, expand if API supports sub-regions

3. **Multi-Region Fetch Strategy**
   - What we know: User may want regattas from multiple countries
   - What's unclear: Whether to make multiple API calls or if there's a bulk endpoint
   - Recommendation: Make parallel fetches per configured region, merge results client-side

## Sources

### Primary (HIGH confidence)
- Next.js 16 Caching Documentation: https://nextjs.org/docs/app/getting-started/caching-and-revalidating
- Next.js 16 Caching Guide: https://nextjs.org/docs/app/guides/caching
- Existing codebase: `src/lib/regatta-central/client.ts`, `src/lib/regatta-central/types.ts`
- Existing codebase: `src/components/calendar/unified-calendar.tsx`

### Secondary (MEDIUM confidence)
- React DayPicker Custom Modifiers: https://daypicker.dev/guides/custom-modifiers
- RC API V4 Overview: https://api.regattacentral.com/v4/apiV4.jsp

### Tertiary (LOW confidence)
- RC API Cookbook PDF (PDF parsing failed): https://api.regattacentral.com/v4/RegattaCentral_APIV4_Cookbook.pdf
- Web search results for RC API specifics (rate limits, specific endpoints)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing dependencies, no new libraries needed
- Architecture: HIGH - Extending existing patterns from codebase
- Caching strategy: HIGH - Verified from official Next.js 16 docs
- RC API details: MEDIUM - Authentication confirmed, but rate limits/filtering specifics unclear
- Calendar visualization: MEDIUM - Custom modifiers approach is sound, but spanning bar CSS is custom implementation

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable patterns, unlikely to change)
