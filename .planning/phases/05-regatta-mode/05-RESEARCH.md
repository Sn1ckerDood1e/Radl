# Phase 5: Regatta Mode - Research

**Researched:** 2026-01-21
**Domain:** Third-party API integration (Regatta Central), race scheduling, timeline views, scheduled notifications
**Confidence:** MEDIUM

## Summary

Regatta Mode requires integrating the Regatta Central API v4 (OAuth2 with server-side flow), building timeline-based race schedule views, extending the existing offline infrastructure for regatta-specific data, and implementing scheduled race notifications using Supabase pg_cron. The existing Phase 4 infrastructure (Dexie.js, push notifications, sync queue) provides a solid foundation that can be extended for regatta-specific offline storage.

Regatta Central API uses OAuth2 with password grant (not PKCE), requiring server-side token management and refresh handling. Race times are delivered as Unix timestamps in milliseconds and may change during regatta operations. The data model needs to extend the existing Regatta placeholder with entries (races), lineups, and notification scheduling. Timeline views are well-served by existing React libraries like Flowbite Timeline (already using Flowbite in the project) or building custom with Tailwind.

**Primary recommendation:** Use server-side OAuth2 flow with encrypted token storage in database, extend IndexedDB schema for regatta/entry caching, implement scheduled notifications via Supabase pg_cron polling pattern, and build timeline UI using Flowbite Timeline component for consistency with existing design system.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing Dexie.js | 4.2+ | Extend IndexedDB for regatta data | Already integrated in Phase 4 |
| Existing web-push | 3.6.7 | Push notifications | Already integrated in Phase 4 |
| Supabase pg_cron | Built-in | Scheduled notification jobs | Supabase-native, no external dependencies |
| date-fns-tz | 3.x | Timezone handling | Already using date-fns, adds tz support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Flowbite Timeline | Latest | Timeline UI component | Race schedule visualization |
| crypto (Node built-in) | Built-in | Token encryption | Secure OAuth token storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron | Vercel Cron Jobs | pg_cron more flexible for dynamic scheduling; Vercel limited to static schedules |
| Flowbite Timeline | react-chrono | react-chrono more feature-rich but adds new dependency; Flowbite matches existing UI |
| Server OAuth | PKCE browser flow | RC API uses password grant, not PKCE; server flow more secure for token storage |

**Installation:**
```bash
npm install date-fns-tz
# Flowbite already installed; no new UI dependencies needed
```

## Regatta Central API Integration

### OAuth2 Authentication Flow

**Endpoint:** `https://api.regattacentral.com/oauth2/api/token`

**Token Request (Password Grant):**
```typescript
// Source: https://api.regattacentral.com/v4/apiV4.jsp
const response = await fetch('https://api.regattacentral.com/oauth2/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.RC_CLIENT_ID,
    client_secret: process.env.RC_CLIENT_SECRET,
    username: userRCCredentials.username,
    password: userRCCredentials.password,
  }),
});

const { access_token, refresh_token, expires_in } = await response.json();
```

**Token Refresh:**
```typescript
const response = await fetch('https://api.regattacentral.com/oauth2/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.RC_CLIENT_ID,
    client_secret: process.env.RC_CLIENT_SECRET,
    refresh_token: storedRefreshToken,
  }),
});
```

**Key Endpoints for Team Data:**

| Endpoint | Returns |
|----------|---------|
| `GET /v4.0/regattas/{country}/upcoming` | List of upcoming regattas |
| `GET /v4.0/regattas/{regattaId}` | Regatta details |
| `GET /v4.0/regattas/{regattaId}/events` | Events at regatta |
| `GET /v4.0/regattas/{regattaId}/club/{clubId}/events` | Team's entries at regatta |
| `GET /v4.0/regattas/{regattaId}/club/{clubId}/draw` | Team's lane assignments |
| `GET /v4.0/regattas/{regattaId}/event/{eventId}/races` | Races for an event |

**Data Format:**
- Timestamps: Unix milliseconds (`"timestamp": 1418956219482`)
- Fields: `eventId`, `uuid`, `sequence`, `label`, `title`, `code`, `gender`, `athleteClass`, `equipment`, `sweep`, `coxed`, `status`

### Confidence: MEDIUM
- OAuth2 flow verified via official API documentation
- Endpoint patterns verified; exact response schemas need runtime validation
- Rate limits not documented; should implement conservative defaults

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db/
│   │   └── schema.ts          # Extend for OfflineRegatta, OfflineEntry
│   ├── regatta-central/
│   │   ├── client.ts          # RC API client with auth
│   │   ├── types.ts           # RC API response types
│   │   └── sync.ts            # Import/sync logic
│   └── push/
│       └── triggers.ts        # Add notifyRaceReminder
├── app/
│   ├── api/
│   │   ├── regattas/
│   │   │   ├── route.ts       # CRUD
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/entries/route.ts
│   │   └── regatta-central/
│   │       ├── connect/route.ts    # OAuth connection
│   │       ├── disconnect/route.ts
│   │       └── import/route.ts     # Import schedules
│   └── (dashboard)/
│       └── regattas/
│           ├── page.tsx            # List view
│           ├── [id]/page.tsx       # Detail view with timeline
│           └── new/page.tsx        # Manual creation
supabase/
└── functions/
    └── process-race-notifications/  # Cron-triggered notification processor
```

### Pattern 1: OAuth Token Storage
**What:** Securely store RC OAuth tokens per-team with encryption
**When to use:** Any third-party OAuth integration with long-lived tokens
**Example:**
```typescript
// prisma/schema.prisma addition
model RegattaCentralConnection {
  id             String    @id @default(uuid())
  teamId         String    @unique
  rcClubId       String    // Regatta Central organization ID
  encryptedToken String    // AES-256 encrypted access token
  refreshToken   String    // AES-256 encrypted refresh token
  expiresAt      DateTime
  lastSyncAt     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@index([teamId])
}
```

```typescript
// src/lib/regatta-central/client.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.RC_TOKEN_ENCRYPTION_KEY!; // 32 bytes

export function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':');
  const decipher = createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Pattern 2: Extended Data Model for Entries
**What:** Model regatta entries (races) with lineup and notification tracking
**When to use:** Storing race schedule with lineup assignments
**Example:**
```prisma
// prisma/schema.prisma additions

enum RegattaSource {
  REGATTA_CENTRAL
  MANUAL
}

enum EntryStatus {
  SCHEDULED
  SCRATCHED
  COMPLETED
}

// Extend existing Regatta model
model Regatta {
  id                String        @id @default(uuid())
  teamId            String
  seasonId          String
  name              String
  location          String?
  venue             String?       // Specific venue/course
  startDate         DateTime
  endDate           DateTime?
  source            RegattaSource @default(MANUAL)
  rcRegattaId       String?       // Regatta Central ID if imported
  lastSyncAt        DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  team    Team    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  season  Season  @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  entries Entry[]

  @@unique([teamId, rcRegattaId])
  @@index([teamId])
  @@index([teamId, seasonId])
}

model Entry {
  id              String      @id @default(uuid())
  regattaId       String
  eventName       String      // e.g., "Women's Varsity 8+"
  eventCode       String?     // RC event code
  rcEntryId       String?     // Regatta Central entry ID
  scheduledTime   DateTime    // Race time (UTC)
  meetingLocation String?     // Where to rig/meet
  meetingTime     DateTime?   // When to meet (optional, derived from scheduledTime - offset)
  notes           String?     // Special instructions
  status          EntryStatus @default(SCHEDULED)
  heat            String?     // e.g., "Heat 1", "Final"
  lane            Int?
  placement       Int?        // Result after race
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  regatta            Regatta              @relation(fields: [regattaId], references: [id], onDelete: Cascade)
  entryLineup        EntryLineup?
  notificationConfig NotificationConfig?

  @@unique([regattaId, rcEntryId])
  @@index([regattaId])
  @@index([regattaId, scheduledTime])
}

model EntryLineup {
  id        String   @id @default(uuid())
  entryId   String   @unique
  boatId    String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  entry Entry          @relation(fields: [entryId], references: [id], onDelete: Cascade)
  boat  Equipment?     @relation(fields: [boatId], references: [id])
  seats EntrySeat[]

  @@index([entryId])
}

model EntrySeat {
  id            String   @id @default(uuid())
  entryLineupId String
  athleteId     String
  position      Int      // 1=Bow, etc.
  side          SeatSide

  entryLineup EntryLineup    @relation(fields: [entryLineupId], references: [id], onDelete: Cascade)
  athlete     AthleteProfile @relation(fields: [athleteId], references: [id])

  @@unique([entryLineupId, position])
  @@unique([entryLineupId, athleteId])
  @@index([entryLineupId])
}

model NotificationConfig {
  id                String   @id @default(uuid())
  entryId           String   @unique
  leadTimeMinutes   Int      @default(60)  // Default 1 hour before
  notificationSent  Boolean  @default(false)
  scheduledFor      DateTime?
  sentAt            DateTime?

  entry Entry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  @@index([scheduledFor, notificationSent])
}
```

### Pattern 3: Timeline View Component
**What:** Chronological race display using Flowbite Timeline
**When to use:** Displaying day's race schedule
**Example:**
```typescript
// src/components/regatta/race-timeline.tsx
'use client';
import { Timeline, TimelineItem, TimelinePoint, TimelineContent, TimelineTime, TimelineTitle, TimelineBody } from 'flowbite-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface RaceEntry {
  id: string;
  eventName: string;
  scheduledTime: Date;
  meetingLocation?: string;
  status: 'SCHEDULED' | 'SCRATCHED' | 'COMPLETED';
  heat?: string;
  lane?: number;
  lineup?: {
    boatName?: string;
    seats: { athleteName: string; position: number }[];
  };
}

interface RaceTimelineProps {
  entries: RaceEntry[];
  timezone: string; // e.g., 'America/New_York'
  currentTime?: Date;
}

export function RaceTimeline({ entries, timezone, currentTime = new Date() }: RaceTimelineProps) {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );

  return (
    <Timeline>
      {sortedEntries.map((entry) => {
        const isPast = new Date(entry.scheduledTime) < currentTime;
        const isNext = !isPast && sortedEntries.findIndex(e =>
          new Date(e.scheduledTime) > currentTime
        ) === sortedEntries.indexOf(entry);

        return (
          <TimelineItem key={entry.id}>
            <TimelinePoint
              className={
                entry.status === 'COMPLETED' ? 'bg-green-500' :
                entry.status === 'SCRATCHED' ? 'bg-gray-400' :
                isNext ? 'bg-blue-500 ring-4 ring-blue-200' :
                'bg-gray-300'
              }
            />
            <TimelineContent>
              <TimelineTime>
                {formatInTimeZone(entry.scheduledTime, timezone, 'h:mm a')}
                {entry.heat && ` - ${entry.heat}`}
                {entry.lane && ` (Lane ${entry.lane})`}
              </TimelineTime>
              <TimelineTitle className={entry.status === 'SCRATCHED' ? 'line-through text-gray-400' : ''}>
                {entry.eventName}
              </TimelineTitle>
              <TimelineBody>
                {entry.meetingLocation && (
                  <p className="text-sm text-gray-600">Meet: {entry.meetingLocation}</p>
                )}
                {entry.lineup && (
                  <p className="text-sm">{entry.lineup.boatName}: {entry.lineup.seats.map(s => s.athleteName).join(', ')}</p>
                )}
              </TimelineBody>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
```

### Pattern 4: Scheduled Notifications with pg_cron
**What:** Process race notifications on a schedule using database polling
**When to use:** Time-based notifications where exact timing matters
**Example:**
```sql
-- Enable extensions (one-time setup)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule notification processor to run every 5 minutes
SELECT cron.schedule(
  'process-race-notifications',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/process-race-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

```typescript
// supabase/functions/process-race-notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find notifications due in next 5 minutes
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const { data: dueNotifications } = await supabase
    .from('NotificationConfig')
    .select(`
      id,
      entryId,
      entry:Entry(
        eventName,
        scheduledTime,
        meetingLocation,
        regatta:Regatta(teamId, name)
      )
    `)
    .eq('notificationSent', false)
    .lte('scheduledFor', fiveMinutesFromNow.toISOString())
    .gte('scheduledFor', now.toISOString());

  if (!dueNotifications?.length) {
    return new Response(JSON.stringify({ processed: 0 }));
  }

  // Process each notification
  for (const notification of dueNotifications) {
    const entry = notification.entry;
    const teamId = entry.regatta.teamId;

    // Get athletes in lineup for this entry
    const { data: lineup } = await supabase
      .from('EntryLineup')
      .select('seats:EntrySeat(athlete:AthleteProfile(teamMember:TeamMember(userId)))')
      .eq('entryId', notification.entryId)
      .single();

    const userIds = lineup?.seats?.map(
      (s: any) => s.athlete.teamMember.userId
    ).filter(Boolean) || [];

    if (userIds.length > 0) {
      // Send notification via existing send-notification function
      await supabase.functions.invoke('send-notification', {
        body: {
          teamId,
          userIds,
          title: `Race Reminder: ${entry.eventName}`,
          body: entry.meetingLocation
            ? `Meet at ${entry.meetingLocation}`
            : `Race at ${new Date(entry.scheduledTime).toLocaleTimeString()}`,
          url: `/regattas/${entry.regatta.id}`,
          tag: `race-${notification.entryId}`,
        },
      });
    }

    // Mark as sent
    await supabase
      .from('NotificationConfig')
      .update({ notificationSent: true, sentAt: new Date().toISOString() })
      .eq('id', notification.id);
  }

  return new Response(JSON.stringify({ processed: dueNotifications.length }));
});
```

### Pattern 5: Offline Storage Extension
**What:** Extend IndexedDB schema for regatta and entry data
**When to use:** Caching regatta data for offline access at venues
**Example:**
```typescript
// src/lib/db/schema.ts - Extensions
export interface OfflineRegatta {
  id: string;
  teamId: string;
  name: string;
  location?: string;
  venue?: string;
  startDate: string;
  endDate?: string;
  cachedAt: number;
}

export interface OfflineEntry {
  id: string;
  regattaId: string;
  eventName: string;
  scheduledTime: string;  // ISO string
  meetingLocation?: string;
  meetingTime?: string;
  notes?: string;
  status: 'SCHEDULED' | 'SCRATCHED' | 'COMPLETED';
  heat?: string;
  lane?: number;
  lineup?: {
    boatId?: string;
    boatName?: string;
    seats: {
      position: number;
      athleteId: string;
      athleteName: string;
      side: 'PORT' | 'STARBOARD' | 'NONE';
    }[];
  };
  cachedAt: number;
}

// Extend AppDB class
export class AppDB extends Dexie {
  // ... existing tables
  regattas!: Table<OfflineRegatta>;
  entries!: Table<OfflineEntry>;

  constructor() {
    super('radl-offline');

    // Version 2: Add regatta tables
    this.version(2).stores({
      schedules: 'id, teamId, date, cachedAt, [teamId+date]',
      lineups: 'id, practiceId, blockId, cachedAt, [practiceId+blockId]',
      syncQueue: '++id, timestamp, entity',
      cacheMeta: 'key',
      regattas: 'id, teamId, startDate, cachedAt',
      entries: 'id, regattaId, scheduledTime, cachedAt, [regattaId+scheduledTime]',
    });
  }
}
```

### Anti-Patterns to Avoid
- **Storing OAuth tokens in browser:** RC tokens must stay server-side; never expose to client
- **Polling RC API frequently:** No documented rate limits; implement conservative caching (15+ min refresh)
- **Ignoring timezone complexity:** Race times are local to venue; store UTC but display in venue timezone
- **Single notification timing:** Allow configurable lead time (30min, 1hr, 2hr) per entry
- **Syncing all regattas:** Only sync upcoming regattas (next 30 days) for the team's RC club

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeline UI | Custom CSS timeline | Flowbite Timeline | Consistent with existing UI, accessible, responsive |
| Timezone display | Manual UTC offset math | date-fns-tz formatInTimeZone | Handles DST, locale formats, edge cases |
| Scheduled jobs | setTimeout chains | Supabase pg_cron | Survives server restarts, observable, reliable |
| Token encryption | Custom encoding | Node crypto AES-256 | Standard, auditable, proven security |
| OAuth token refresh | Manual expiry tracking | Auth.js/NextAuth patterns | Race condition handling, automatic refresh |
| Offline data sync | Custom fetch + cache | Extend existing Dexie patterns | Consistent with Phase 4, tested infrastructure |

**Key insight:** The existing Phase 4 offline infrastructure (Dexie.js, sync queue, cache manager) should be extended, not replaced. Regattas and entries are conceptually similar to schedules and lineups.

## Common Pitfalls

### Pitfall 1: RC API Token Expiration During Regatta
**What goes wrong:** Token expires mid-import, leaving partial data
**Why it happens:** RC tokens have limited lifetime; long-running imports may exceed it
**How to avoid:**
- Check token expiration before starting import
- Refresh token proactively if <10 minutes remaining
- Wrap import in transaction-like logic (rollback partial on failure)
**Warning signs:**
- 401 errors during import
- Partial regatta data in database

### Pitfall 2: Race Time Changes Not Reflected
**What goes wrong:** Athlete gets notification for old time; race moved to new time
**Why it happens:** Regatta schedules change frequently; cached data becomes stale
**How to avoid:**
- Re-sync regatta data morning of race day
- Reschedule notifications when entry time changes
- Show "last synced" timestamp prominently in UI
- On schedule change, invalidate existing notification and create new one
**Warning signs:**
- NotificationConfig.scheduledFor doesn't match Entry.scheduledTime
- Athletes complain about wrong times

### Pitfall 3: Timezone Confusion at Venue
**What goes wrong:** Race shows wrong time because device timezone differs from venue
**Why it happens:** User travels to regatta in different timezone; phone auto-adjusts
**How to avoid:**
- Store venue timezone on Regatta model
- Always display times in venue timezone, not device timezone
- Show timezone indicator in UI (e.g., "10:30 AM EDT")
- Allow user to toggle between venue and local time
**Warning signs:**
- Race times off by hours
- Athletes miss races despite getting notification "on time"

### Pitfall 4: Duplicate Entries from Multiple Syncs
**What goes wrong:** Same race appears multiple times after re-importing
**Why it happens:** No unique constraint or upsert logic for RC entries
**How to avoid:**
- Use `rcEntryId` as unique identifier for imported entries
- Implement upsert (insert or update) logic
- Add unique constraint: `@@unique([regattaId, rcEntryId])`
**Warning signs:**
- Duplicate events in timeline
- "Event already exists" errors

### Pitfall 5: Notification Timing Edge Cases
**What goes wrong:** Notification scheduled for past time (race already happened)
**Why it happens:** Entry created/imported after its scheduled time minus lead time
**How to avoid:**
- Calculate notification time: `scheduledTime - leadTimeMinutes`
- If notification time is in past, either send immediately or skip
- Handle race postponements that push notification into future
**Warning signs:**
- Notifications never sent
- Notifications sent after race completed

### Pitfall 6: Offline Data Grows Unbounded
**What goes wrong:** IndexedDB fills up with old regatta data
**Why it happens:** Regattas are cached but never cleaned up
**How to avoid:**
- Clean up regatta data for events older than 7 days
- Limit cache to upcoming regattas (next 30 days)
- Implement cache eviction in background
**Warning signs:**
- IndexedDB quota warnings
- Slow app startup

## Code Examples

Verified patterns from official sources:

### RC API Client with Token Refresh
```typescript
// src/lib/regatta-central/client.ts
import { prisma } from '@/lib/prisma';
import { encryptToken, decryptToken } from './encryption';

const RC_BASE_URL = 'https://api.regattacentral.com/v4.0';

export class RegattaCentralClient {
  private teamId: string;

  constructor(teamId: string) {
    this.teamId = teamId;
  }

  private async getConnection() {
    const conn = await prisma.regattaCentralConnection.findUnique({
      where: { teamId: this.teamId },
    });
    if (!conn) throw new Error('Regatta Central not connected');
    return conn;
  }

  private async refreshTokenIfNeeded() {
    const conn = await this.getConnection();

    // Refresh if expiring in next 10 minutes
    if (conn.expiresAt.getTime() - Date.now() < 10 * 60 * 1000) {
      const refreshToken = decryptToken(conn.refreshToken);

      const response = await fetch('https://api.regattacentral.com/oauth2/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.RC_CLIENT_ID!,
          client_secret: process.env.RC_CLIENT_SECRET!,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Regatta Central token');
      }

      const data = await response.json();
      await prisma.regattaCentralConnection.update({
        where: { teamId: this.teamId },
        data: {
          encryptedToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      });
    }
  }

  async fetch(endpoint: string) {
    await this.refreshTokenIfNeeded();
    const conn = await this.getConnection();
    const token = decryptToken(conn.encryptedToken);

    const response = await fetch(`${RC_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`RC API error: ${response.status}`);
    }

    return response.json();
  }

  async getTeamEvents(regattaId: string) {
    const conn = await this.getConnection();
    return this.fetch(`/regattas/${regattaId}/club/${conn.rcClubId}/events`);
  }

  async getUpcomingRegattas(country = 'US') {
    return this.fetch(`/regattas/${country}/upcoming`);
  }
}
```

### Import Regatta Schedule API Route
```typescript
// src/app/api/regatta-central/import/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsFromRequest } from '@/lib/auth/claims';
import { RegattaCentralClient } from '@/lib/regatta-central/client';

export async function POST(req: Request) {
  const claims = await getClaimsFromRequest(req);
  if (!claims || claims.role !== 'COACH') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { rcRegattaId, seasonId } = await req.json();

  const client = new RegattaCentralClient(claims.teamId);

  // Get regatta details and team's events
  const [regattaData, eventsData] = await Promise.all([
    client.fetch(`/regattas/${rcRegattaId}`),
    client.getTeamEvents(rcRegattaId),
  ]);

  // Upsert regatta
  const regatta = await prisma.regatta.upsert({
    where: {
      teamId_rcRegattaId: {
        teamId: claims.teamId,
        rcRegattaId: rcRegattaId,
      },
    },
    create: {
      teamId: claims.teamId,
      seasonId,
      name: regattaData.name,
      location: regattaData.location,
      startDate: new Date(regattaData.startDate),
      endDate: regattaData.endDate ? new Date(regattaData.endDate) : null,
      source: 'REGATTA_CENTRAL',
      rcRegattaId,
      lastSyncAt: new Date(),
    },
    update: {
      name: regattaData.name,
      location: regattaData.location,
      startDate: new Date(regattaData.startDate),
      endDate: regattaData.endDate ? new Date(regattaData.endDate) : null,
      lastSyncAt: new Date(),
    },
  });

  // Upsert entries
  for (const event of eventsData.events) {
    await prisma.entry.upsert({
      where: {
        regattaId_rcEntryId: {
          regattaId: regatta.id,
          rcEntryId: event.entryId,
        },
      },
      create: {
        regattaId: regatta.id,
        eventName: event.title,
        eventCode: event.code,
        rcEntryId: event.entryId,
        scheduledTime: new Date(event.raceTime), // RC returns Unix ms
        status: 'SCHEDULED',
      },
      update: {
        eventName: event.title,
        scheduledTime: new Date(event.raceTime),
      },
    });
  }

  return NextResponse.json({ regatta, entriesImported: eventsData.events.length });
}
```

### Notification Scheduling Helper
```typescript
// src/lib/notifications/race-notifications.ts
import { prisma } from '@/lib/prisma';

export async function scheduleRaceNotification(
  entryId: string,
  leadTimeMinutes: number = 60
) {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { scheduledTime: true },
  });

  if (!entry) throw new Error('Entry not found');

  const notificationTime = new Date(
    entry.scheduledTime.getTime() - leadTimeMinutes * 60 * 1000
  );

  // Don't schedule notifications in the past
  const now = new Date();
  if (notificationTime < now) {
    console.log(`Notification time is past, skipping for entry ${entryId}`);
    return null;
  }

  return prisma.notificationConfig.upsert({
    where: { entryId },
    create: {
      entryId,
      leadTimeMinutes,
      scheduledFor: notificationTime,
      notificationSent: false,
    },
    update: {
      leadTimeMinutes,
      scheduledFor: notificationTime,
      notificationSent: false, // Reset if time changed
      sentAt: null,
    },
  });
}

export async function rescheduleNotificationsForEntry(entryId: string) {
  const config = await prisma.notificationConfig.findUnique({
    where: { entryId },
    select: { leadTimeMinutes: true },
  });

  if (config) {
    return scheduleRaceNotification(entryId, config.leadTimeMinutes);
  }
  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side OAuth | Server-side OAuth with encrypted storage | Established best practice | Better security, no token exposure |
| setTimeout for notifications | pg_cron with database polling | 2024-2025 | Reliable, survives restarts |
| Manual timezone handling | date-fns-tz | Established | Proper DST handling |
| Polling for sync | Event-driven + periodic refresh | Ongoing | Balance freshness vs API limits |

**Deprecated/outdated:**
- Storing OAuth tokens in localStorage (security risk)
- Client-side OAuth for APIs requiring client_secret (not supported by RC)
- Manual cron with setInterval (unreliable in serverless)

## Open Questions

Things that couldn't be fully resolved:

1. **RC API Rate Limits**
   - What we know: No rate limits documented in official API docs
   - What's unclear: Actual limits, if any; error codes for rate limiting
   - Recommendation: Implement conservative caching (15 min minimum), add retry with backoff

2. **RC Event/Entry Update Frequency**
   - What we know: Regatta schedules can change frequently on race day
   - What's unclear: Does RC API provide webhooks or change notifications?
   - Recommendation: Poll periodically (every 15 min during regatta); add manual "Sync Now" button

3. **Exact RC Data Response Schema**
   - What we know: High-level structure from docs (eventId, title, code, etc.)
   - What's unclear: Complete field list, nested structures, optional vs required
   - Recommendation: Build incrementally; log full responses during development; add TypeScript types as discovered

4. **Venue Timezone Detection**
   - What we know: Should display times in venue timezone
   - What's unclear: Does RC provide venue timezone? Need to store manually?
   - Recommendation: Initially allow manual timezone selection on regatta; enhance if RC provides it

5. **Notification Reliability at Venue**
   - What we know: Venues often have poor connectivity
   - What's unclear: How to handle notifications when user offline
   - Recommendation: Pre-cache notifications locally; show in-app even if push fails; sync notification status when back online

## Sources

### Primary (HIGH confidence)
- [RegattaCentral API v4 Documentation](https://api.regattacentral.com/v4/apiV4.jsp) - OAuth2 flow, endpoints
- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/cron) - Scheduled jobs
- [Supabase Edge Functions Scheduling](https://supabase.com/docs/guides/functions/schedule-functions) - Edge function triggers
- [Dexie.js Documentation](https://dexie.org/docs/) - IndexedDB schema patterns
- [date-fns-tz Documentation](https://date-fns.org/v3/docs/Time-Zones) - Timezone handling

### Secondary (MEDIUM confidence)
- [Flowbite React Timeline](https://flowbite-react.com/docs/components/timeline) - Timeline component
- [Auth.js Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation) - OAuth token patterns
- [Handling Timezones in Enterprise Applications](https://medium.com/@20011002nimeth/handling-timezones-within-enterprise-level-applications-utc-vs-local-time-309cbe438eaf) - Timezone best practices
- [Processing Large Jobs with Edge Functions](https://supabase.com/blog/processing-large-jobs-with-edge-functions) - Polling pattern

### Tertiary (LOW confidence)
- WebSearch results on regatta management UX - General patterns, not RC-specific
- Various blog posts on scheduled notifications - Conceptual, needs validation

## Metadata

**Confidence breakdown:**
- Regatta Central API: MEDIUM - OAuth flow verified; endpoint details need runtime validation
- Data model: HIGH - Based on existing schema patterns and API documentation
- Offline architecture: HIGH - Extends proven Phase 4 infrastructure
- Notification scheduling: MEDIUM - pg_cron approach verified; timing edge cases need testing
- Timeline UI: HIGH - Flowbite component verified, matches existing UI

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - RC API appears stable; pg_cron/Supabase evolving)
