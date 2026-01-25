# Phase 17: Facility UI Features - Research

**Researched:** 2026-01-25
**Domain:** React/Next.js admin dashboard with multi-tenant facility management
**Confidence:** HIGH

## Summary

Researched existing codebase patterns for facility admin UI features. The codebase has mature patterns for dashboards, equipment management, practice scheduling, and invitation/approval flows that can be directly applied to facility-level features.

**Key findings:**
- Dashboard card grid pattern is well-established (`/[teamSlug]/page.tsx` serves as template)
- Facility auth context is fully implemented with viewMode switching (facility/club)
- Equipment ownership model supports FACILITY, CLUB, and TEAM with isShared flag
- Practice-linked booking requires new EquipmentBooking schema (not yet implemented)
- Invitation approval pattern exists and can be adapted for equipment requests
- No existing event cross-club creation pattern (needs new implementation)

**Primary recommendation:** Build facility UI pages following established club dashboard patterns, leverage existing context switcher infrastructure, and add new EquipmentBooking schema for reservation system.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 | Latest | App Router, Server Components | Project framework |
| React | 19 | UI components | Next.js default |
| Prisma | Latest | Database ORM | Project standard |
| @casl/ability | Latest | Authorization | Existing RBAC system |
| Tailwind CSS | Latest | Styling | Project design system |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | Latest | Form handling | All forms (equipment, events) |
| zod | Latest | Validation schemas | API validation |
| date-fns | Latest | Date manipulation | Event scheduling |
| lucide-react | Latest | Icons | UI consistency |

**Installation:**
Already installed - no new dependencies needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── (dashboard)/
│       └── facility/
│           └── [facilitySlug]/
│               ├── page.tsx              # Main facility dashboard
│               ├── clubs/
│               │   └── page.tsx          # Club list with drill-down
│               ├── equipment/
│               │   ├── page.tsx          # Shared equipment list
│               │   └── [id]/
│               │       └── page.tsx      # Equipment detail
│               ├── events/
│               │   ├── page.tsx          # Cross-club events
│               │   └── new/
│               │       └── page.tsx      # Create event
│               └── settings/
│                   └── page.tsx          # Facility settings
├── components/
│   └── facility/
│       ├── club-card.tsx                 # Club grid card
│       ├── equipment-request-panel.tsx   # Approval UI
│       ├── cross-club-event-form.tsx     # Event creation
│       └── stats-cards.tsx               # Dashboard stats
└── lib/
    └── equipment/
        └── booking.ts                    # Booking logic helpers
```

### Pattern 1: Dashboard Card Grid
**What:** Large clickable cards in grid layout for primary navigation
**When to use:** Main facility dashboard, mirrors club dashboard pattern
**Example:**
```typescript
// Source: src/app/(dashboard)/[teamSlug]/page.tsx (lines 137-163)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Link
    href={`/${teamSlug}/equipment`}
    className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-emerald-500/20">
        {/* Icon SVG */}
      </div>
      <span className="text-3xl font-bold text-[var(--text-primary)]">{count}</span>
    </div>
    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Title</h3>
    <p className="text-sm text-[var(--text-muted)]">Description</p>
  </Link>
</div>
```

### Pattern 2: Facility Context Switching
**What:** viewMode-based routing with facility/club context in httpOnly cookies
**When to use:** All facility-level pages, access control
**Example:**
```typescript
// Source: src/lib/auth/claims.ts (lines 158-170)
// Derive viewMode from cookie state
let viewMode: 'facility' | 'club' | null = null;

if (facilityId && !clubId) {
  // Facility cookie set but no club - facility-level view
  viewMode = 'facility';
} else if (facilityId && clubId) {
  // Both set - club view within facility
  viewMode = 'club';
} else if (clubId) {
  // Only club set (legacy path) - treat as club view
  viewMode = 'club';
}
```

### Pattern 3: Equipment Ownership Model
**What:** Three-tier ownership (FACILITY, CLUB, TEAM) with shared equipment flag
**When to use:** Equipment queries, filtering, access control
**Example:**
```typescript
// Source: prisma/schema.prisma (lines 276-316)
model Equipment {
  ownerType  EquipmentOwnerType @default(TEAM)
  facilityId String?
  clubId     String?
  isShared   Boolean @default(false)  // Club equipment shared with facility

  facility   Facility? @relation("FacilityEquipment", fields: [facilityId], references: [id])
  club       Team?     @relation("ClubEquipment", fields: [clubId], references: [id])
}

enum EquipmentOwnerType {
  FACILITY  // Shared across facility
  CLUB      // Club-exclusive
  TEAM      // Legacy
}

// Query patterns:
// Facility-owned equipment:
where: { facilityId: facilityId, ownerType: 'FACILITY' }

// Shared equipment (club-owned but facility-accessible):
where: { facilityId: facilityId, isShared: true }
```

### Pattern 4: Request/Approval UI
**What:** Tabbed interface with pending/approved lists and action buttons
**When to use:** Equipment requests, similar to invitation system
**Example:**
```typescript
// Source: src/app/(dashboard)/[teamSlug]/invitations/invitations-client.tsx (lines 156-219)
// Tab for pending items with approve/deny actions
<div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
  <div className="divide-y divide-zinc-800">
    {pendingItems.map(item => (
      <div key={item.id} className="px-6 py-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-white">{item.title}</p>
          <p className="text-sm text-zinc-500">{item.details}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleApprove(item.id)}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Approve
          </button>
          <button
            onClick={() => handleDeny(item.id)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Deny
          </button>
        </div>
      </div>
    ))}
  </div>
</div>
```

### Pattern 5: Practice Form with Equipment Integration
**What:** Practice creation form includes EquipmentAvailabilityPanel
**When to use:** Practice-linked booking flow
**Example:**
```typescript
// Source: src/components/practices/practice-form.tsx (lines 271-280)
{/* Equipment Availability Section */}
<div>
  <label className={labelClassName}>Equipment Status</label>
  <p className="text-xs text-zinc-500 mt-1 mb-3">
    Review equipment availability before planning your practice
  </p>
  <EquipmentAvailabilityPanel />
</div>

// EquipmentAvailabilityPanel: Lazy-loads on expand, shows availability
// Source: src/components/practices/equipment-availability-panel.tsx
```

### Anti-Patterns to Avoid
- **Direct facility navigation without viewMode check:** Always verify `viewMode === 'facility'` before showing facility-level data
- **Client-side only auth checks:** Use server components with getClaimsForApiRoute for security
- **Mixing club/facility equipment queries:** Always filter by ownerType to prevent data leaks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashboard layout | Custom grid | Club dashboard pattern | Already responsive, accessible, tested |
| Context switching | New auth logic | Existing facility-context.ts + ContextSwitcher | Handles cookies, JWT refresh, validation |
| Equipment filtering | Custom queries | accessibleBy(ability).Equipment | CASL permissions built-in |
| Form validation | Manual checks | Zod schemas + react-hook-form | Type-safe, error handling |
| Calendar integration | New event UI | UnifiedCalendar component | Already handles practices/regattas |
| Approval workflow | Custom state | Invitation pattern | Request/approve/deny logic exists |

**Key insight:** Facility UI is mostly composition of existing club-level components with different data scoping. Resist building new patterns when club patterns can be adapted.

## Common Pitfalls

### Pitfall 1: Equipment Booking Schema Gap
**What goes wrong:** Practice-linked booking requires EquipmentBooking table that doesn't exist yet
**Why it happens:** Schema added equipment ownership but not reservation tracking
**How to avoid:** Add EquipmentBooking schema before implementing booking UI:
```prisma
model EquipmentBooking {
  id           String   @id @default(uuid())
  equipmentId  String
  clubId       String   // Who booked it
  practiceId   String?  // Optional: linked to practice
  startTime    DateTime
  endTime      DateTime
  status       BookingStatus @default(PENDING)
  requestedBy  String   // userId
  approvedBy   String?
  createdAt    DateTime @default(now())

  equipment    Equipment @relation(fields: [equipmentId], references: [id])
  club         Team @relation(fields: [clubId], references: [id])
  practice     Practice? @relation(fields: [practiceId], references: [id])

  @@index([equipmentId, startTime, endTime])
  @@index([clubId])
}

enum BookingStatus {
  PENDING
  APPROVED
  DENIED
  CANCELLED
}
```
**Warning signs:** Practice form tries to book equipment but no booking record created

### Pitfall 2: Facility Admin Full Control vs. Club Admin Permissions
**What goes wrong:** Unclear when facility admin acts "as facility" vs "on behalf of club"
**Why it happens:** Two permission models overlap (facility-level + club-level)
**How to avoid:**
- Facility admin on facility pages = facility-scoped actions (view all clubs, manage shared equipment)
- Facility admin clicking into club dashboard = inherits CLUB_ADMIN role for that club
- Use viewMode to determine permission context
**Warning signs:** Facility admin can't access club settings when they should be able to

### Pitfall 3: Cross-Club Event Creation Without Multi-Club Schema
**What goes wrong:** Creating single event for multiple clubs requires copying Event records
**Why it happens:** Event model has single teamId (club-scoped), no facility-event concept
**How to avoid:**
- Create facility event as template
- Copy to each selected club's practices/events
- Track relationship via metadata field (facilityEventId)
- User decision: "Clubs can modify their copy" means decoupled after creation
**Warning signs:** Updating facility event doesn't propagate to clubs (correct behavior per requirements)

### Pitfall 4: Booking Window Configuration Missing
**What goes wrong:** "Facility admin configurable booking window" has no settings model
**Why it happens:** FacilitySettings doesn't exist, only TeamSettings
**How to avoid:** Add FacilitySettings model or extend Facility table:
```prisma
model Facility {
  // ... existing fields
  bookingWindowDays Int @default(30)  // How far in advance clubs can book
  bookingRules      Json @default("{}") // Custom rules per facility
}
```
**Warning signs:** Hardcoded booking window in UI

### Pitfall 5: Equipment Request Notification Missing
**What goes wrong:** Club doesn't know another club requested their equipment
**Why it happens:** Notification model exists but not wired to booking requests
**How to avoid:** Create notification on booking request:
```typescript
await prisma.notification.create({
  data: {
    teamId: bookingOwnerClubId,
    userId: clubAdminUserId,
    type: 'EQUIPMENT_REQUEST',  // Add to enum
    title: 'Equipment Request',
    message: `${requestingClub.name} requested ${equipment.name}`,
    linkUrl: `/equipment/requests/${bookingId}`,
  },
});
```
**Warning signs:** Equipment requests sit unnoticed

## Code Examples

Verified patterns from official sources:

### Facility Dashboard Page
```typescript
// Source: src/app/(dashboard)/facility/[facilitySlug]/page.tsx (lines 10-57)
export default async function FacilityDashboardPage({ params }: Props) {
  const { facilitySlug } = await params;

  // Get validated claims
  const { user, facilityId, viewMode, error } = await getClaimsForApiRoute();

  if (error || !user) redirect('/login');

  // Verify facility view mode
  if (viewMode !== 'facility') redirect('/');

  // Get facility
  const facility = await prisma.facility.findUnique({
    where: { slug: facilitySlug },
    select: { id: true, name: true, /* ... */ },
  });

  if (!facility) redirect('/');

  // Verify FACILITY_ADMIN role
  const facilityMembership = await prisma.facilityMembership.findFirst({
    where: {
      facilityId: facility.id,
      userId: user.id,
      isActive: true,
      roles: { has: 'FACILITY_ADMIN' },
    },
  });

  if (!facilityMembership) redirect('/');

  // Get clubs with stats
  const clubs = await prisma.team.findMany({
    where: { facilityId: facility.id },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { members: true, equipment: true } },
    },
    orderBy: { name: 'asc' },  // Alphabetical per requirements
  });

  // Render dashboard...
}
```

### Equipment Availability Check
```typescript
// Source: src/components/practices/equipment-availability-panel.tsx (lines 33-47)
const fetchEquipment = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/equipment');
    if (!response.ok) throw new Error('Failed to load equipment');
    const data = await response.json();
    setEquipment(data.equipment);  // Already has isAvailable computed
    setHasFetched(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load equipment');
  } finally {
    setIsLoading(false);
  }
};
```

### Club Drill-Down Link
```typescript
// Source: src/app/(dashboard)/facility/[facilitySlug]/page.tsx (lines 140-168)
{clubs.map((club) => (
  <Link
    key={club.id}
    href={`/${club.slug}`}  // Navigate to club dashboard
    className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--border-subtle)] hover:border-[var(--border)] transition-all"
  >
    <div className="flex items-center gap-3 mb-3">
      {club.logoUrl ? (
        <img src={club.logoUrl} alt={club.name} className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold bg-emerald-600">
          {club.name.charAt(0)}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">{club.name}</h3>
        <p className="text-xs text-[var(--text-muted)]">/{club.slug}</p>
      </div>
    </div>
    <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
      <span>{club._count.members} members</span>
      <span>{club._count.equipment} equipment</span>
    </div>
  </Link>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TeamMember (single role) | ClubMembership (multiple roles) | Phase 12 | Facility admin can have CLUB_ADMIN + other roles |
| Team-only ownership | Equipment.ownerType (FACILITY/CLUB/TEAM) | Phase 12 | Enables shared equipment model |
| Single-club user | Multi-club with context switching | Phase 13 | Users can belong to multiple clubs in facility |
| Club-level auth only | Facility + Club hierarchy | Phase 13 | Facility admin has cross-club visibility |

**Deprecated/outdated:**
- TeamMember.role (single): Use ClubMembership.roles (array)
- Equipment.teamId only: Check Equipment.ownerType and use facilityId/clubId
- getCurrentClubId(): Use getClaimsForApiRoute() which returns facilityId + clubId + viewMode

## Open Questions

Things that couldn't be fully resolved:

1. **Equipment Booking Conflict Detection**
   - What we know: Partial boat availability (e.g., 2 of 3 8+ boats available) requires tracking individual boat bookings
   - What's unclear: Should API compute availability on-demand or cache it? How to handle concurrent bookings?
   - Recommendation: Start with simple "is booked at time" check, optimize later if needed. Use database transaction for booking to prevent race conditions.

2. **Facility Event Propagation**
   - What we know: User wants clubs to have "full control after creation" (can modify their copy)
   - What's unclear: If facility admin deletes original event, should club copies remain?
   - Recommendation: Decouple after creation - facility event is template only, club copies are independent. Document this in UI.

3. **Billing Visibility Implementation**
   - What we know: "Facility bills centrally - manages one subscription"
   - What's unclear: Is Stripe integration already in place? Where is subscription data stored?
   - Recommendation: Research existing billing implementation before building visibility UI. May be out of scope if billing not yet implemented.

## Sources

### Primary (HIGH confidence)
- Codebase exploration: src/app/(dashboard)/[teamSlug]/page.tsx - Dashboard card grid pattern
- Codebase exploration: src/app/(dashboard)/facility/[facilitySlug]/page.tsx - Existing facility dashboard
- Codebase exploration: src/lib/auth/claims.ts - Facility context and viewMode derivation
- Codebase exploration: src/components/layout/context-switcher.tsx - Context switching UI
- Codebase exploration: prisma/schema.prisma - Equipment ownership model
- Codebase exploration: src/components/practices/practice-form.tsx - Practice creation flow
- Codebase exploration: src/app/(dashboard)/[teamSlug]/invitations/invitations-client.tsx - Request/approval pattern

### Secondary (MEDIUM confidence)
- Phase 17 CONTEXT.md - User decisions on dashboard layout, booking flow, event creation

### Tertiary (LOW confidence)
- None - all research based on existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Patterns verified in production code
- Pitfalls: MEDIUM - Schema gaps identified but solutions not tested
- Booking system: LOW - Requires new schema, conflict detection logic not implemented

**Research date:** 2026-01-25
**Valid until:** 30 days (stable codebase, established patterns)

**Missing infrastructure:**
- EquipmentBooking schema (must be added)
- FacilitySettings model (optional, can hardcode initially)
- EQUIPMENT_REQUEST notification type (extend enum)
- Cross-club event APIs (new implementation required)
