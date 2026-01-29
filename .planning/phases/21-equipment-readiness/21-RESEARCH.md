# Phase 21: Equipment Readiness - Research

**Researched:** 2026-01-26
**Domain:** Equipment management, status calculation, UI components
**Confidence:** HIGH

## Summary

This phase builds on the existing equipment and damage report infrastructure. The codebase already has a foundation for equipment readiness (`src/lib/equipment/readiness.ts`) that calculates availability based on manual overrides and open damage reports. This phase extends that foundation with:

1. **Time-based inspection tracking** - Add `lastInspectedAt` field to Equipment model
2. **Threshold-based status calculation** - Extend readiness logic to compute READY/INSPECT_SOON/NEEDS_ATTENTION/OUT_OF_SERVICE
3. **Team-configurable thresholds** - Extend TeamSettings model with readiness threshold fields
4. **Visual badge components** - Reuse existing badge pattern (class-variance-authority + cva)
5. **Dashboard fleet health widget** - Add widget to existing dashboard structure
6. **Maintenance workflow enhancements** - Extend DamageReport resolution with optional notes

The existing infrastructure provides: Equipment model, DamageReport model with status enum, TeamSettings with API routes, badge component patterns using `class-variance-authority`, and dashboard component structure. All pieces are in place to implement this phase as an extension, not a rebuild.

**Primary recommendation:** Extend existing models and components rather than creating new infrastructure. The readiness calculation logic already exists and follows the compute-on-read pattern (no caching, no background jobs) which aligns perfectly with phase requirements.

## Standard Stack

The codebase uses an established stack that this phase will follow.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 | App Router framework | Server components for data fetching, API routes for mutations |
| Prisma | 6.0.0 | Database ORM | Type-safe queries, schema migrations, relation management |
| Zod | 4.3.5 | Runtime validation | Schema validation for API inputs, type inference |
| class-variance-authority | 0.7.1 | Component variants | Badge styling with variant props (used in announcement-priority-badge) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | 2.1.1 + 3.4.0 | Conditional classes | cn() utility for merging Tailwind classes |
| date-fns | 4.1.0 | Date manipulation | Calculate "days since inspection" for threshold checks |
| lucide-react | 0.562.0 | Icons | Status badge icons (checkmark, alert, warning) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cva for badges | Manual class strings | cva provides type-safe variants and easier maintenance |
| Compute-on-read | Cached status field | Context decision: calculate on page load, no background jobs |

**Installation:**
```bash
# All dependencies already installed
# No new packages required for this phase
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── equipment/
│   │   └── readiness.ts              # EXTEND: Add threshold-based calculation
│   ├── validations/
│   │   └── equipment-settings.ts     # NEW: Zod schema for threshold settings
│   └── utils/
│       └── date-time-helpers.ts      # EXTEND: Add daysSince helper
├── components/
│   ├── equipment/
│   │   ├── readiness-badge.tsx       # NEW: Status badge component
│   │   └── fleet-health-widget.tsx   # NEW: Dashboard widget
│   └── settings/
│       └── readiness-settings.tsx    # NEW: Threshold configuration form
├── app/
│   ├── (dashboard)/[teamSlug]/
│   │   ├── equipment/
│   │   │   └── page.tsx              # EXTEND: Add readiness badges to list
│   │   └── settings/
│   │       └── page.tsx              # EXTEND: Add readiness settings section
│   └── api/
│       ├── team-settings/
│       │   └── route.ts              # EXTEND: Add threshold fields to PATCH
│       └── equipment/[id]/
│           └── route.ts              # EXTEND: Add lastInspectedAt update
```

### Pattern 1: Readiness Calculation (Compute-on-Read)
**What:** Calculate equipment status from database fields at query time, no caching
**When to use:** Every equipment list/detail page load
**Example:**
```typescript
// Source: Existing pattern in src/lib/equipment/readiness.ts
export interface EquipmentReadinessStatus {
  status: 'READY' | 'INSPECT_SOON' | 'NEEDS_ATTENTION' | 'OUT_OF_SERVICE';
  reasons: string[];
  daysSinceInspection: number | null;
}

export function calculateReadinessStatus(
  equipment: Equipment & { damageReports: DamageReport[] },
  thresholds: { inspectSoonDays: number; needsAttentionDays: number; outOfServiceDays: number }
): EquipmentReadinessStatus {
  const reasons: string[] = [];

  // 1. Manual override takes precedence
  if (equipment.manualUnavailable) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: [equipment.manualUnavailableNote || 'Marked unavailable'],
      daysSinceInspection: null,
    };
  }

  // 2. Check open damage reports by severity
  const criticalReports = equipment.damageReports.filter(r => r.status === 'OPEN' && r.severity === 'CRITICAL');
  const moderateReports = equipment.damageReports.filter(r => r.status === 'OPEN' && r.severity === 'MODERATE');

  if (criticalReports.length > 0) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: criticalReports.map(r => `Critical: ${r.location}`),
      daysSinceInspection: null,
    };
  }

  // 3. Calculate days since inspection
  const daysSince = equipment.lastInspectedAt
    ? Math.floor((Date.now() - equipment.lastInspectedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSince === null || daysSince > thresholds.outOfServiceDays) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: ['No inspection record'],
      daysSinceInspection: daysSince,
    };
  }

  if (daysSince > thresholds.needsAttentionDays || moderateReports.length > 0) {
    if (moderateReports.length > 0) reasons.push(`${moderateReports.length} moderate damage report(s)`);
    if (daysSince > thresholds.needsAttentionDays) reasons.push(`${daysSince} days since inspection`);
    return { status: 'NEEDS_ATTENTION', reasons, daysSinceInspection: daysSince };
  }

  if (daysSince > thresholds.inspectSoonDays) {
    return {
      status: 'INSPECT_SOON',
      reasons: [`${daysSince} days since inspection`],
      daysSinceInspection: daysSince,
    };
  }

  return { status: 'READY', reasons: [], daysSinceInspection: daysSince };
}
```

### Pattern 2: Badge Component with CVA
**What:** Type-safe variant-based styling using class-variance-authority
**When to use:** Status indicators that need consistent styling and color coding
**Example:**
```typescript
// Source: Existing pattern in src/components/announcements/announcement-priority-badge.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const readinessBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
  {
    variants: {
      status: {
        READY: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        INSPECT_SOON: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
        NEEDS_ATTENTION: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        OUT_OF_SERVICE: "bg-red-500/15 text-red-400 border border-red-500/20",
      },
    },
    defaultVariants: {
      status: "READY",
    },
  }
)

export function ReadinessBadge({ status, className }: { status: string; className?: string }) {
  return (
    <div className={cn(readinessBadgeVariants({ status: status as any, className }))}>
      <StatusIcon status={status} />
      <span>{status.replace(/_/g, ' ')}</span>
    </div>
  )
}
```

### Pattern 3: TeamSettings Extension
**What:** Extend existing TeamSettings model and API route with new fields
**When to use:** Adding team-configurable settings
**Example:**
```typescript
// Prisma schema extension
model TeamSettings {
  id                       String   @id @default(uuid())
  teamId                   String   @unique
  damageNotifyUserIds      String[] // Existing field
  // NEW: Readiness thresholds
  readinessInspectSoonDays    Int   @default(14)
  readinessNeedsAttentionDays Int   @default(21)
  readinessOutOfServiceDays   Int   @default(30)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
}

// API route extension (src/app/api/team-settings/route.ts)
const updateSettingsSchema = z.object({
  damageNotifyUserIds: z.array(z.string().uuid()).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  // NEW: Add readiness threshold fields
  readinessInspectSoonDays: z.number().int().min(1).max(365).optional(),
  readinessNeedsAttentionDays: z.number().int().min(1).max(365).optional(),
  readinessOutOfServiceDays: z.number().int().min(1).max(365).optional(),
});
```

### Pattern 4: Dashboard Widget Integration
**What:** Add widget to existing dashboard page using same card structure
**When to use:** Displaying aggregate data on team dashboard
**Example:**
```typescript
// Source: Existing pattern in src/app/(dashboard)/[teamSlug]/page.tsx
// Fleet health widget follows same structure as "Upcoming Practices" widget

<div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
  <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fleet Health</h2>
    <Link
      href={`/${teamSlug}/equipment`}
      className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
    >
      View all
    </Link>
  </div>
  <div className="p-4">
    {/* Status breakdown: counts by status */}
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Don't add background jobs for status calculation** - Context decision: calculate on page load only
- **Don't cache readiness status in database** - Compute from source data (inspection date, damage reports)
- **Don't create separate maintenance model** - Extend DamageReport with resolution notes field
- **Don't use separate enum tables** - Status enums are code-level constants, not database tables

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Component variant styling | Manual class string concatenation | class-variance-authority (cva) | Type-safe variants, better autocomplete, already used in codebase |
| Date difference calculation | Manual timestamp math | date-fns differenceInDays() | Handles edge cases, timezone-aware, already installed |
| Conditional Tailwind classes | Template literals with ternaries | cn() utility (clsx + tailwind-merge) | Deduplicates classes, handles conflicts correctly |
| Form validation | Custom validators | Zod schemas | Runtime + compile-time safety, type inference, already used everywhere |
| Settings persistence | Custom storage logic | Extend TeamSettings model + API route | Follows existing pattern, RLS already configured |

**Key insight:** The codebase has mature patterns for all required functionality. This phase is 80% extension of existing code, 20% new components. Don't reinvent wheels.

## Common Pitfalls

### Pitfall 1: Threshold Logic Order Matters
**What goes wrong:** Checking thresholds in wrong order produces incorrect status (e.g., checking INSPECT_SOON before OUT_OF_SERVICE)
**Why it happens:** Natural to check from least to most severe, but logic should fail-fast on most severe conditions
**How to avoid:**
- Check manual override FIRST (absolute override)
- Then critical damage reports (immediate out-of-service)
- Then time thresholds from most to least severe (30d → 21d → 14d)
- Then moderate damage reports
**Warning signs:** Equipment showing INSPECT_SOON when it has critical damage

### Pitfall 2: Null lastInspectedAt Handling
**What goes wrong:** Equipment with no inspection date crashes calculation or shows as READY
**Why it happens:** Assuming all equipment has been inspected at least once
**How to avoid:**
- Treat `null` lastInspectedAt as "never inspected" → OUT_OF_SERVICE
- Display "No inspection record" reason
- Provide "Mark as Inspected" button to set initial timestamp
**Warning signs:** New equipment added without inspection shows incorrect status

### Pitfall 3: Threshold Changes Don't Update UI
**What goes wrong:** Coach changes thresholds in settings, but equipment status doesn't reflect changes until page refresh
**Why it happens:** Client-side component holds stale threshold data
**How to avoid:**
- Settings page redirects or revalidates after save
- Equipment list page fetches fresh thresholds on every load (server component)
- No client-side threshold caching
**Warning signs:** User reports "changed settings but nothing happened"

### Pitfall 4: Badge Color Inconsistency
**What goes wrong:** Using different color schemes for same status across components
**Why it happens:** Hardcoding colors instead of using CVA variants
**How to avoid:**
- Define badge variants ONCE in readiness-badge component
- Import and reuse everywhere (list, detail, dashboard)
- Use semantic names (READY, INSPECT_SOON) not colors (green, yellow)
**Warning signs:** Same status showing different colors on different pages

### Pitfall 5: Missing Severity in Damage Report Query
**What goes wrong:** Readiness calculation can't distinguish CRITICAL from MINOR damage reports
**Why it happens:** Prisma select only includes basic DamageReport fields
**How to avoid:**
- Always include `severity` and `status` fields when querying damageReports
- Use existing type: `Pick<DamageReport, 'id' | 'severity' | 'status' | 'location'>`
**Warning signs:** All damage reports treated the same regardless of severity

### Pitfall 6: Dashboard Widget Performance
**What goes wrong:** Fleet health widget runs separate query for each piece of equipment
**Why it happens:** Computing readiness status per-item instead of batch
**How to avoid:**
- Fetch ALL equipment with damage reports in single query
- Use `computeMultipleEquipmentReadiness()` helper (already exists)
- Aggregate status counts in JavaScript (array.reduce)
**Warning signs:** Dashboard slow to load with many equipment items

## Code Examples

Verified patterns from codebase:

### Equipment Query with Readiness Data
```typescript
// Source: Existing pattern in src/lib/equipment/readiness.ts + Prisma queries
const equipment = await prisma.equipment.findMany({
  where: { teamId: team.id },
  include: {
    damageReports: {
      where: { status: 'OPEN' },
      select: { id: true, severity: true, status: true, location: true, description: true },
    },
  },
  orderBy: [{ type: 'asc' }, { name: 'asc' }],
});

// Get team thresholds
const settings = await prisma.teamSettings.findUnique({
  where: { teamId: team.id },
  select: {
    readinessInspectSoonDays: true,
    readinessNeedsAttentionDays: true,
    readinessOutOfServiceDays: true,
  },
});

const thresholds = {
  inspectSoonDays: settings?.readinessInspectSoonDays ?? 14,
  needsAttentionDays: settings?.readinessNeedsAttentionDays ?? 21,
  outOfServiceDays: settings?.readinessOutOfServiceDays ?? 30,
};

// Compute readiness for each
const equipmentWithReadiness = equipment.map(e => ({
  ...e,
  readiness: calculateReadinessStatus(e, thresholds),
}));
```

### Mark as Inspected API Endpoint
```typescript
// Source: Existing pattern in src/app/api/equipment/[id]/route.ts
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, claims, error } = await getClaimsForApiRoute();
  if (error || !user) return unauthorizedResponse();
  if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update equipment');

  const { id } = await params;
  const body = await request.json();

  // Validate with Zod
  const schema = z.object({
    markInspected: z.boolean().optional(),
    // ... other update fields
  });

  const validationResult = schema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const updateData: any = {};

  if (validationResult.data.markInspected) {
    updateData.lastInspectedAt = new Date();
  }

  const updated = await prisma.equipment.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
```

### Dashboard Fleet Health Query
```typescript
// Optimized single-query approach
const [equipment, settings] = await Promise.all([
  prisma.equipment.findMany({
    where: { teamId: team.id, status: 'ACTIVE' },
    include: {
      damageReports: {
        where: { status: 'OPEN' },
        select: { id: true, severity: true, status: true },
      },
    },
  }),
  prisma.teamSettings.findUnique({
    where: { teamId: team.id },
    select: {
      readinessInspectSoonDays: true,
      readinessNeedsAttentionDays: true,
      readinessOutOfServiceDays: true,
    },
  }),
]);

const thresholds = {
  inspectSoonDays: settings?.readinessInspectSoonDays ?? 14,
  needsAttentionDays: settings?.readinessNeedsAttentionDays ?? 21,
  outOfServiceDays: settings?.readinessOutOfServiceDays ?? 30,
};

// Aggregate status counts
const statusCounts = equipment.reduce((acc, e) => {
  const status = calculateReadinessStatus(e, thresholds).status;
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

### DamageReport Resolution with Notes
```typescript
// Extend existing PATCH endpoint at src/app/api/equipment/[id]/damage-reports/[reportId]/route.ts
const updateSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']),
  resolutionNote: z.string().optional(), // NEW: Optional note on resolution
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // ... auth checks

  const body = await request.json();
  const validated = updateSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const updateData: any = {
    status: validated.data.status,
  };

  if (validated.data.status === 'RESOLVED') {
    updateData.resolvedAt = new Date();
    updateData.resolvedBy = user.id;
    if (validated.data.resolutionNote) {
      updateData.resolutionNote = validated.data.resolutionNote; // NEW field
    }
  }

  const updated = await prisma.damageReport.update({
    where: { id: reportId },
    data: updateData,
  });

  return NextResponse.json(updated);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Availability boolean field | Compute-on-read from multiple factors | Existing (readiness.ts) | More flexible, no stale data |
| Global equipment settings | Per-team threshold configuration | This phase | Teams set own inspection schedules |
| Binary available/unavailable | 4-level status scale | This phase | Better visibility into maintenance needs |
| Manual status tracking | Automatic calculation from inspection dates | This phase | Reduces coach workload |

**Deprecated/outdated:**
- N/A - This is a new feature, not replacing existing functionality

## Open Questions

Things that couldn't be fully resolved:

1. **Archive behavior for MINOR damage reports**
   - What we know: Context says "MINOR archived after resolution"
   - What's unclear: Archive mechanism (soft delete vs separate table vs status field)
   - Recommendation: Add `archivedAt: DateTime?` field to DamageReport, exclude from readiness calculation when not null

2. **Initial lastInspectedAt value for existing equipment**
   - What we know: Equipment model doesn't currently have this field
   - What's unclear: Migration strategy - set to createdAt, null, or require manual inspection?
   - Recommendation: Default to null (requires inspection), provide bulk "Mark All as Inspected" tool for coaches

3. **Fleet health widget placement on dashboard**
   - What we know: Dashboard has existing widgets (announcements, upcoming practices)
   - What's unclear: Widget order priority, above or below practices?
   - Recommendation: Place after announcements, before practices (equipment issues are time-sensitive but less urgent than announcements)

## Sources

### Primary (HIGH confidence)
- Prisma schema: `/home/hb/radl/prisma/schema.prisma` - Equipment, DamageReport, TeamSettings models
- Existing readiness logic: `/home/hb/radl/src/lib/equipment/readiness.ts` - Compute-on-read pattern
- TeamSettings API: `/home/hb/radl/src/app/api/team-settings/route.ts` - Extension pattern
- Badge component: `/home/hb/radl/src/components/announcements/announcement-priority-badge.tsx` - CVA usage
- Dashboard structure: `/home/hb/radl/src/app/(dashboard)/[teamSlug]/page.tsx` - Widget patterns

### Secondary (MEDIUM confidence)
- Phase context: `.planning/phases/21-equipment-readiness/21-CONTEXT.md` - User decisions from /gsd:discuss-phase
- Requirements: `.planning/REQUIREMENTS.md` - EQR-01, EQR-02, EQR-03 definitions

### Tertiary (LOW confidence)
- None - All research based on codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, patterns in active use
- Architecture: HIGH - Existing code provides clear extension points
- Pitfalls: HIGH - Based on actual codebase patterns and common database/React mistakes

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable domain, mature codebase)
