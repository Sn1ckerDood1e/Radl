# Phase 38: Facility & Club Management - Research

**Researched:** 2026-01-31
**Domain:** Super admin CRUD operations for facilities and clubs
**Confidence:** HIGH

## Summary

Phase 38 implements full CRUD operations for facilities and clubs within the super admin panel. This builds directly on the established admin patterns from Phases 36-37 (admin auth, user management). The codebase already has mature patterns for admin routes, API endpoints, audit logging, and UI components that this phase will follow.

Key findings:
- The admin infrastructure is fully established (layout, auth, sidebar, session timeout)
- Facility and Club/Team models are already defined in Prisma with proper relationships
- Audit actions for facility/club operations are pre-defined in `actions.ts`
- Soft delete is NOT currently implemented in the schema; hard delete with cascade is the pattern
- The "type-to-confirm" pattern for destructive actions is a new requirement (like GitHub delete repo)

**Primary recommendation:** Follow the established admin patterns exactly. Use Prisma directly (bypassing RLS), log all mutations via `createAdminAuditLogger`, and implement type-to-confirm dialogs for delete operations.

## Standard Stack

The stack is already established in this codebase. No new libraries needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 | App Router, RSC, API routes | Project framework |
| Prisma | 6.0.0 | ORM for PostgreSQL | Bypasses RLS for admin |
| Supabase | 2.93.3 | Auth operations (not data) | Admin client for auth ops |
| Zod | 4.3.5 | Validation schemas | API request validation |
| react-hook-form | 7.71.1 | Form state management | Admin forms |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.15 | Confirmation modals | Delete confirmations |
| @radix-ui/react-select | 2.2.6 | Facility dropdown | Move club operation |
| sonner | 2.0.7 | Toast notifications | Success/error feedback |
| lucide-react | 0.562.0 | Icons | UI consistency |

### No New Libraries Needed

All required functionality exists in the codebase.

**Installation:** N/A - all dependencies present

## Architecture Patterns

### Recommended Route Structure
```
src/app/(admin)/admin/
  facilities/
    page.tsx                    # FCLT-01: List facilities
    new/page.tsx               # FCLT-02: Create facility form
    [facilityId]/
      page.tsx                 # FCLT-04: Facility details
      edit/page.tsx            # FCLT-03: Edit facility form
      not-found.tsx
      loading.tsx
  clubs/
    page.tsx                   # CLUB-01: List all clubs (grouped by facility)
    new/page.tsx              # CLUB-02: Create club form
    [clubId]/
      page.tsx                # CLUB-04: Club details
      edit/page.tsx           # CLUB-03: Edit club form
      move/page.tsx           # CLUB-06: Move club (or dialog from detail)
      not-found.tsx
      loading.tsx

src/app/api/admin/
  facilities/
    route.ts                   # GET (list), POST (create)
    [facilityId]/
      route.ts                 # GET (detail), PATCH (update), DELETE (soft)
  clubs/
    route.ts                   # GET (list all), POST (create)
    [clubId]/
      route.ts                 # GET (detail), PATCH (update), DELETE (soft)
      move/route.ts            # POST (move to new facility)
```

### Pattern 1: Admin API Route Structure
**What:** Standard pattern for all admin API endpoints
**When to use:** Every admin API route
**Example:**
```typescript
// Source: /src/app/api/admin/users/route.ts (existing pattern)
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = createFacilitySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    // 3. Perform database operation
    const facility = await prisma.facility.create({
      data: parseResult.data,
    });

    // 4. Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_FACILITY_CREATED',
      targetType: 'Facility',
      targetId: facility.id,
      afterState: { name: facility.name, slug: facility.slug },
    });

    // 5. Return success response
    return NextResponse.json({ success: true, facility }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'admin/facilities:POST');
  }
}
```

### Pattern 2: Server Component Page with Cookie Forwarding
**What:** Fetch data from internal API in server components
**When to use:** Admin list and detail pages
**Example:**
```typescript
// Source: /src/app/(admin)/admin/users/page.tsx (existing pattern)
import { cookies } from 'next/headers';

async function getFacilities(): Promise<FacilitiesResponse | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${appUrl}/api/admin/facilities`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('[admin/facilities] Fetch error:', error);
    return null;
  }
}
```

### Pattern 3: Type-to-Confirm Delete Dialog
**What:** Require user to type entity name to confirm deletion
**When to use:** Facility delete, club delete (destructive operations with cascade impact)
**Example:**
```typescript
// New pattern per CONTEXT.md requirement
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TypeToConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;        // e.g., "Riverside Boathouse"
  entityType: 'facility' | 'club';
  cascadeWarning: string;    // e.g., "This will affect 5 clubs and 120 members"
  onConfirm: () => void;
  isLoading?: boolean;
}

export function TypeToConfirmDialog({
  open, onOpenChange, entityName, entityType, cascadeWarning, onConfirm, isLoading
}: TypeToConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const isConfirmEnabled = inputValue === entityName;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete {entityType}</DialogTitle>
          <DialogDescription>
            {cascadeWarning}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-[var(--text-secondary)]">
            To confirm, type <strong>{entityName}</strong> below:
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={entityName}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading}
            loading={isLoading}
          >
            Delete {entityType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 4: Move Club Operation
**What:** Transfer a club from one facility to another
**When to use:** CLUB-06 requirement
**Example:**
```typescript
// API route pattern for move operation
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminContext = await getSuperAdminContext();
  if (!adminContext) return unauthorizedResponse();

  const { clubId } = await params;
  const body = await request.json();
  const { targetFacilityId } = moveClubSchema.parse(body);

  // Get current state for audit
  const club = await prisma.team.findUnique({
    where: { id: clubId },
    include: {
      facility: { select: { id: true, name: true } },
      _count: { select: { clubMemberships: true } }
    }
  });

  if (!club) return notFoundResponse('Club');

  // Verify target facility exists
  const targetFacility = await prisma.facility.findUnique({
    where: { id: targetFacilityId },
    select: { id: true, name: true }
  });

  if (!targetFacility) return notFoundResponse('Target facility');

  // Perform the move
  const updated = await prisma.team.update({
    where: { id: clubId },
    data: { facilityId: targetFacilityId }
  });

  // Note: Equipment handling per CONTEXT.md is Claude's discretion
  // Equipment stays with club (clubId relationship) - no change needed

  // Log audit
  const audit = createAdminAuditLogger(request, adminContext.userId);
  await audit.log({
    action: 'ADMIN_CLUB_UPDATED',
    targetType: 'Club',
    targetId: clubId,
    beforeState: { facilityId: club.facilityId, facilityName: club.facility?.name },
    afterState: { facilityId: targetFacilityId, facilityName: targetFacility.name },
    metadata: { action: 'MOVE_CLUB' }
  });

  return NextResponse.json({ success: true, club: updated });
}
```

### Anti-Patterns to Avoid
- **Using RLS/CASL in admin routes:** Admin bypasses all tenant authorization; use Prisma directly
- **Using `getClaimsForApiRoute` in admin:** Use `getSuperAdminContext` instead
- **Hard-coding clubId in audit:** Use 'PLATFORM' for platform-level admin actions
- **Skipping audit logging:** Every mutation MUST be logged per security requirements
- **Implementing soft delete without schema support:** Schema has no `deletedAt` field; use existing hard delete with proper cascade warnings

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom regex | `generateSlug()` from `@/lib/utils/slug` | Already handles edge cases |
| Admin auth check | Custom middleware | `getSuperAdminContext()` | Database-verified, handles nulls |
| Audit logging | Custom logger | `createAdminAuditLogger()` | Extracts IP, user agent, formats correctly |
| Error responses | Custom JSON | `unauthorizedResponse()`, `notFoundResponse()`, etc. | Consistent format, error refs |
| UUID validation | Manual regex | `const uuidRegex = /^[0-9a-f]{8}-...$/i` | Pattern from existing routes |
| Form validation | Custom checks | Zod schemas with `safeParse` | Type inference, error messages |
| Toast notifications | alert() | `toast.success()`, `toast.error()` from sonner | Consistent UX |

**Key insight:** This codebase has mature patterns. Deviation creates inconsistency and bugs.

## Common Pitfalls

### Pitfall 1: Forgetting Cascade Impact Display
**What goes wrong:** User deletes facility without understanding impact on clubs/members
**Why it happens:** Delete confirmation shows generic message
**How to avoid:** Before showing delete dialog, fetch cascade counts:
```typescript
const cascadeInfo = await prisma.facility.findUnique({
  where: { id: facilityId },
  select: {
    _count: {
      select: {
        clubs: true,
        memberships: true
      }
    },
    clubs: {
      select: {
        _count: { select: { clubMemberships: true } }
      }
    }
  }
});
// Calculate total affected members across all clubs
const totalMembers = cascadeInfo.clubs.reduce(
  (sum, club) => sum + club._count.clubMemberships, 0
);
```
**Warning signs:** Delete dialog says "Are you sure?" without numbers

### Pitfall 2: Slug Collision on Create
**What goes wrong:** Two facilities get same slug from similar names
**Why it happens:** Slug generation doesn't check uniqueness
**How to avoid:** Check and append suffix if collision:
```typescript
let slug = generateSlug(name);
let suffix = 1;
while (await prisma.facility.findUnique({ where: { slug } })) {
  slug = `${generateSlug(name)}-${suffix++}`;
}
```
**Warning signs:** Prisma unique constraint errors on facility/club creation

### Pitfall 3: Moving Club Without Equipment Context
**What goes wrong:** Admin moves club, equipment ownership is unclear
**Why it happens:** Equipment has multiple ownership levels (FACILITY, CLUB, TEAM)
**How to avoid:** Display equipment summary in move confirmation:
- Club-owned equipment (`ownerType: 'CLUB'`) moves with club (no change needed)
- Equipment bookings on facility equipment may need review
- Show count of affected items in confirmation dialog
**Warning signs:** Coach confusion about equipment after club move

### Pitfall 4: Soft Delete Without Schema Support
**What goes wrong:** Attempting soft delete when schema lacks `deletedAt`
**Why it happens:** CONTEXT.md mentions "soft delete" but schema uses hard cascade
**How to avoid:**
- Current schema has NO soft delete fields on Facility or Team
- Options: (1) Add migration for `deletedAt` field, OR (2) Use existing cascade delete with thorough confirmation
- Per CONTEXT.md "Claude's discretion on soft delete approach" - recommend hidden vs archived based on implementation cost
**Warning signs:** Looking for `deletedAt` field that doesn't exist

### Pitfall 5: Missing Loading/Error States
**What goes wrong:** UI freezes during API calls
**Why it happens:** Forgot to handle async states
**How to avoid:** Use `loading.tsx` files and error boundaries:
```typescript
// loading.tsx
export default function Loading() {
  return <div className="animate-pulse">Loading facilities...</div>;
}
```
**Warning signs:** White screen during data fetches

## Code Examples

Verified patterns from existing codebase:

### Validation Schema for Facility
```typescript
// New schema following established patterns
import { z } from 'zod';

export const createFacilitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(2).default('US'),
  timezone: z.string().default('America/New_York'),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500).optional(),
});

export const updateFacilitySchema = createFacilitySchema.partial();

export const createClubSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  facilityId: z.string().uuid(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0891b2'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#164e63'),
});

export const moveClubSchema = z.object({
  targetFacilityId: z.string().uuid('Invalid facility ID'),
});
```

### Shared Form Component Pattern
```typescript
// Following UserForm pattern from /src/components/admin/users/user-form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';

interface FacilityFormProps {
  mode: 'create' | 'edit';
  facilityId?: string;
  defaultValues?: Partial<FacilityFormData>;
}

export function FacilityForm({ mode, facilityId, defaultValues }: FacilityFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FacilityFormData>({
    resolver: zodResolver(createFacilityFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      slug: defaultValues?.slug || '',
      // ... other fields
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  // Auto-generate slug from name
  const nameValue = watch('name');
  const handleNameBlur = () => {
    if (mode === 'create' && !watch('slug')) {
      setValue('slug', generateSlug(nameValue));
    }
  };

  const onSubmit = async (data: FacilityFormData) => {
    try {
      const url = mode === 'create'
        ? '/api/admin/facilities'
        : `/api/admin/facilities/${facilityId}`;

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save facility');
      }

      showSuccessToast(
        mode === 'create' ? 'Facility created!' : 'Facility updated!'
      );

      router.push('/admin/facilities');
      router.refresh();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to save facility',
        retry: () => onSubmit(data),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields following established pattern */}
    </form>
  );
}
```

### Aggregate Stats Query
```typescript
// For FCLT-01, FCLT-04, CLUB-01
const facilitiesWithStats = await prisma.facility.findMany({
  select: {
    id: true,
    name: true,
    slug: true,
    city: true,
    state: true,
    createdAt: true,
    _count: {
      select: {
        clubs: true,           // Club count
        memberships: true,     // Direct facility memberships
      }
    },
    clubs: {
      select: {
        _count: {
          select: { clubMemberships: true }
        }
      }
    }
  },
  orderBy: { name: 'asc' }
});

// Calculate total members across all clubs
const facilities = facilitiesWithStats.map(f => ({
  ...f,
  clubCount: f._count.clubs,
  memberCount: f.clubs.reduce((sum, c) => sum + c._count.clubMemberships, 0),
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT claims for admin | Database-verified SuperAdmin | Phase 36 | Must query database every request |
| CASL in admin routes | Prisma direct | Phase 36 | Admin bypasses all tenant auth |
| Simple confirm dialogs | Type-to-confirm | Phase 38 | New pattern for destructive actions |

**Deprecated/outdated:**
- `getClaimsForApiRoute` in admin routes: Use `getSuperAdminContext` instead
- AbilityProvider in admin: Not needed, admin has `can('manage', 'all')`

## Open Questions

Things that couldn't be fully resolved:

1. **Soft delete implementation**
   - What we know: CONTEXT.md mentions "soft delete" with "hidden vs archived tab" as Claude's discretion
   - What's unclear: Schema has no `deletedAt` field on Facility or Team models
   - Recommendation: Add `deletedAt DateTime?` field via migration, filter by `deletedAt: null` in queries, show "Archived" tab for deleted items. Alternatively, proceed with hard delete + thorough cascade warnings if migration is out of scope.

2. **Equipment behavior on club move**
   - What we know: Equipment has `clubId` relation (stays with club), `facilityId` relation (facility-owned)
   - What's unclear: Should facility equipment bookings by the moved club be cancelled?
   - Recommendation: Club-owned equipment (`ownerType: CLUB`) automatically moves with club. Facility equipment bookings should remain valid (equipment stays at facility, booking is historical). Display summary in move confirmation.

## Sources

### Primary (HIGH confidence)
- `/home/hb/radl/prisma/schema.prisma` - Facility, Team models with relationships
- `/home/hb/radl/src/app/api/admin/users/route.ts` - Admin API pattern
- `/home/hb/radl/src/app/(admin)/admin/users/page.tsx` - Admin page pattern
- `/home/hb/radl/src/lib/auth/admin-authorize.ts` - Super admin verification
- `/home/hb/radl/src/lib/audit/logger.ts` - Audit logging pattern
- `/home/hb/radl/src/lib/audit/actions.ts` - Pre-defined audit actions
- `/home/hb/radl/src/components/admin/users/user-form.tsx` - Form component pattern
- `/home/hb/radl/src/components/admin/users/user-actions-dropdown.tsx` - Dialog confirmation pattern

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions for Phase 38 - User requirements
- STATE.md architecture decisions - Platform patterns

### Tertiary (LOW confidence)
- None - all findings from codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in codebase
- Architecture: HIGH - patterns established in Phases 36-37
- Pitfalls: HIGH - derived from actual schema and code analysis

**Research date:** 2026-01-31
**Valid until:** 2026-02-28 (stable patterns, internal codebase)
