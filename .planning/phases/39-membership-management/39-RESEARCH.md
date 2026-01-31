# Phase 39: Membership Management - Research

**Researched:** 2026-01-31
**Domain:** Super Admin Membership CRUD Operations
**Confidence:** HIGH

## Summary

Phase 39 implements super admin capabilities for directly managing user-club relationships without going through the normal invitation flow. This builds on the established admin infrastructure from Phases 36-38 (admin auth, user management, facility/club management). The codebase already has all required models, patterns, and utilities in place.

Key findings:
- `ClubMembership` model already supports multi-role arrays (`roles: Role[]`) - no schema changes needed
- Audit actions for membership operations (`ADMIN_MEMBERSHIP_ADDED`, `ADMIN_MEMBERSHIP_REMOVED`) are pre-defined in `actions.ts`
- User search patterns from Phase 37 (`user-search.tsx`) can be adapted for user selection autocomplete
- CSV bulk import patterns from Phase 37 (`bulk-upload-form.tsx`, `use-admin-csv-parser.ts`) provide the template for bulk membership import
- Command/cmdk library already available for building search/autocomplete components

**Primary recommendation:** Follow established Phase 37/38 admin patterns exactly. Use Prisma for ClubMembership CRUD, adapt existing user search for autocomplete, and extend bulk upload patterns for CSV member import.

## Standard Stack

The stack is already established in this codebase. No new libraries needed.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 | App Router, RSC, API routes | Project framework |
| Prisma | 6.0.0 | ORM for PostgreSQL | ClubMembership CRUD |
| Zod | 4.3.5 | Validation schemas | API request validation |
| react-hook-form | 7.71.1 | Form state management | Admin forms |
| cmdk | 1.0.0+ | Command palette/combobox | User search autocomplete |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| papaparse | 5.5.3 | CSV parsing | Bulk member import |
| @radix-ui/react-popover | 1.1+ | Dropdown positioning | Autocomplete dropdown |
| sonner | 2.0.7 | Toast notifications | Action feedback |
| lucide-react | 0.562.0 | Icons | UI consistency |

### No New Libraries Needed

All required functionality exists in the codebase.

**Installation:** N/A - all dependencies present

## Architecture Patterns

### Recommended Route Structure
```
src/app/(admin)/admin/
  users/[userId]/
    memberships/
      page.tsx                    # View/manage user's memberships (enhancement to existing)
  clubs/[clubId]/
    members/
      page.tsx                    # MEMB-01: List club members, add member
      add/page.tsx               # Add member form with user search
      bulk/page.tsx              # MEMB-05: Bulk CSV import

src/app/api/admin/
  memberships/
    route.ts                      # POST: Create membership (add user to club)
    [membershipId]/
      route.ts                    # PATCH: Update roles, DELETE: Remove membership
  clubs/[clubId]/
    members/
      route.ts                    # GET: List club members
      bulk/route.ts               # POST: Bulk add from CSV
```

### Data Models (Existing)

The `ClubMembership` model already supports all requirements:

```prisma
model ClubMembership {
  id        String   @id @default(uuid())
  clubId    String   // References Team.id (club = team in current schema)
  userId    String   // Supabase auth user ID
  roles     Role[]   // Array of roles (can be COACH + ATHLETE)
  isActive  Boolean  @default(true)
  joinedAt  DateTime @default(now())
  updatedAt DateTime @updatedAt

  club Team @relation("ClubMemberships", fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([clubId, userId])
  @@index([userId])
  @@index([clubId])
}

enum Role {
  FACILITY_ADMIN
  CLUB_ADMIN
  COACH
  ATHLETE
  PARENT
}
```

### Pattern 1: Admin API Route Structure
**What:** Standard pattern for admin API endpoints (from Phase 37/38)
**When to use:** Every admin membership API route

```typescript
// Source: /src/app/api/admin/users/[userId]/route.ts
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
    const parseResult = addMembershipSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    // 3. Perform database operation
    const membership = await prisma.clubMembership.create({
      data: parseResult.data,
    });

    // 4. Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_MEMBERSHIP_ADDED',
      targetType: 'ClubMembership',
      targetId: membership.id,
      afterState: { clubId: membership.clubId, userId: membership.userId, roles: membership.roles },
    });

    // 5. Return success response
    return NextResponse.json({ success: true, membership }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'admin/memberships:POST');
  }
}
```

### Pattern 2: User Search Autocomplete
**What:** Debounced search with dropdown for user selection
**When to use:** Add member dialogs, user selection throughout admin panel

```typescript
// Adapt from existing Command component + user search pattern
'use client';

import { useState, useCallback } from 'react';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface UserSearchComboboxProps {
  onSelect: (user: { id: string; email: string; displayName?: string }) => void;
  placeholder?: string;
}

export function UserSearchCombobox({ onSelect, placeholder = 'Search users...' }: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchUsers = useDebouncedCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users);
      }
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleInputChange = (value: string) => {
    setQuery(value);
    searchUsers(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Trigger button */}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Searching...</div>}
            <CommandEmpty>No users found</CommandEmpty>
            {results.map((user) => (
              <CommandItem
                key={user.id}
                value={user.email}
                onSelect={() => {
                  onSelect(user);
                  setOpen(false);
                }}
              >
                <div>
                  <p className="font-medium">{user.displayName || user.email}</p>
                  {user.displayName && (
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 3: Multi-Role Checkbox Selection
**What:** UI for selecting multiple roles simultaneously
**When to use:** Add member, edit member roles

```typescript
// Role selection with checkboxes
const ROLES = [
  { value: 'FACILITY_ADMIN', label: 'Facility Admin', description: 'Full facility access' },
  { value: 'CLUB_ADMIN', label: 'Club Admin', description: 'Manage club settings and members' },
  { value: 'COACH', label: 'Coach', description: 'Create practices and lineups' },
  { value: 'ATHLETE', label: 'Athlete', description: 'View assigned practices' },
  { value: 'PARENT', label: 'Parent', description: 'View athlete information' },
] as const;

interface RoleSelectorProps {
  value: string[];
  onChange: (roles: string[]) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  const toggleRole = (role: string) => {
    if (value.includes(role)) {
      onChange(value.filter(r => r !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="space-y-2">
      {ROLES.map((role) => (
        <label key={role.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
          <input
            type="checkbox"
            checked={value.includes(role.value)}
            onChange={() => toggleRole(role.value)}
            className="mt-0.5"
          />
          <div>
            <p className="font-medium">{role.label}</p>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
```

### Pattern 4: Membership List with Inline Actions
**What:** Table displaying memberships with edit/remove actions
**When to use:** User detail page memberships section, club members page

```typescript
// Source: Extend /src/components/admin/users/membership-list.tsx
interface MembershipWithActions extends Membership {
  onEditRoles: () => void;
  onRemove: () => void;
}

export function MembershipListWithActions({ memberships }: { memberships: MembershipWithActions[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Club</th>
          <th>Roles</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {memberships.map((m) => (
          <tr key={m.id}>
            <td>{m.clubName}</td>
            <td>
              <div className="flex flex-wrap gap-1">
                {m.roles.map(role => (
                  <Badge key={role} variant="outline">{role}</Badge>
                ))}
              </div>
            </td>
            <td>{formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}</td>
            <td>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={m.onEditRoles}>
                    Edit Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={m.onRemove} className="text-destructive">
                    Remove from Club
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Pattern 5: Bulk CSV Import (Adapted from Phase 37)
**What:** CSV upload for adding multiple users to a club
**When to use:** MEMB-05 bulk add members

```typescript
// CSV format for bulk membership import
// email,role
// coach@example.com,COACH
// athlete1@example.com,ATHLETE
// multi.role@example.com,"COACH,ATHLETE"

const membershipCSVSchema = z.object({
  email: z.string().email(),
  role: z.string().transform((val) => {
    // Support comma-separated roles in quotes
    return val.split(',').map(r => r.trim().toUpperCase());
  }).pipe(z.array(z.enum(['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT']))),
});

// API response for bulk operation
interface BulkMembershipResult {
  total: number;
  added: number;      // Successfully added
  updated: number;    // Already member, roles updated
  skipped: number;    // User not found
  failed: number;     // Other error
  results: Array<{
    email: string;
    status: 'added' | 'updated' | 'skipped' | 'failed';
    reason?: string;
  }>;
}
```

### Anti-Patterns to Avoid

- **Using invitation flow in admin:** Admin bypasses invitations completely - direct ClubMembership creation
- **Forgetting unique constraint:** `ClubMembership` has `@@unique([clubId, userId])` - handle "already member" gracefully
- **Single role assumption:** The schema supports arrays of roles - always use `roles: Role[]`, not `role: Role`
- **Missing isActive check:** When listing members, filter by `isActive: true` unless showing inactive
- **Skipping audit logging:** Every membership mutation MUST be logged per security requirements

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User search | Custom search endpoint | Extend existing `/api/admin/users?search=` | Already handles Supabase + Prisma join |
| CSV parsing | Custom parser | `papaparse` + adapt `useAdminCSVParser` | Handles edge cases, duplicates |
| Debounced search | setTimeout chains | `useDebouncedCallback` hook | Proper cleanup, React-friendly |
| Autocomplete UI | Custom dropdown | `cmdk` Command component | Accessible, keyboard navigation |
| Error responses | Custom JSON | `unauthorizedResponse()`, etc. | Consistent format, error refs |
| Audit logging | Custom logger | `createAdminAuditLogger()` | Extracts IP, formats correctly |

**Key insight:** Phase 37/38 patterns cover all needed functionality. Reuse them directly.

## Common Pitfalls

### Pitfall 1: Duplicate Membership on Add
**What goes wrong:** Prisma throws unique constraint error when adding existing member
**Why it happens:** `@@unique([clubId, userId])` prevents duplicates
**How to avoid:** Check for existing membership first, offer to update roles instead:
```typescript
const existing = await prisma.clubMembership.findUnique({
  where: { clubId_userId: { clubId, userId } }
});

if (existing) {
  // Option 1: Return error with option to update
  return NextResponse.json({
    error: 'User is already a member of this club',
    existingMembership: existing,
    suggestion: 'Use PATCH to update roles instead'
  }, { status: 409 });

  // Option 2: Update roles (if configured)
  // return await updateMembershipRoles(existing.id, roles);
}
```
**Warning signs:** 409 Conflict or P2002 unique constraint errors

### Pitfall 2: User Not Found in System
**What goes wrong:** Email from CSV doesn't match any user in Supabase auth
**Why it happens:** User hasn't registered yet, or typo in email
**How to avoid:** Per CONTEXT.md requirement - skip unknown users with error:
```typescript
// Look up user by email in Supabase
const user = await findUserByEmail(email);
if (!user) {
  results.push({
    email,
    status: 'skipped',
    reason: 'User not found - must be registered first'
  });
  continue;
}
```
**Warning signs:** Bulk import silently failing or creating orphan records

### Pitfall 3: Role Validation on Update
**What goes wrong:** Invalid roles passed, or empty roles array
**Why it happens:** No validation on role array
**How to avoid:** Validate roles are valid enum values and non-empty:
```typescript
const updateRolesSchema = z.object({
  roles: z
    .array(z.enum(['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT']))
    .min(1, 'At least one role is required')
});
```
**Warning signs:** Membership with empty roles array (orphaned member)

### Pitfall 4: Missing Club or User Existence Check
**What goes wrong:** Creating membership with non-existent clubId or userId
**Why it happens:** Relying on FK constraint instead of explicit check
**How to avoid:** Verify both entities exist before creating membership:
```typescript
const [club, userExists] = await Promise.all([
  prisma.team.findUnique({ where: { id: clubId } }),
  getUserById(userId), // Supabase lookup
]);

if (!club) return notFoundResponse('Club');
if (!userExists) return notFoundResponse('User');
```
**Warning signs:** Foreign key constraint violations, orphan records

### Pitfall 5: Forgetting to Handle isActive Flag
**What goes wrong:** Deactivated membership reappears, or inactive shown in lists
**Why it happens:** Not filtering by `isActive` in queries
**How to avoid:** Always consider isActive in business logic:
```typescript
// For listing: show only active
const members = await prisma.clubMembership.findMany({
  where: { clubId, isActive: true },
});

// For adding: reactivate if exists but inactive
const existing = await prisma.clubMembership.findUnique({
  where: { clubId_userId: { clubId, userId } }
});

if (existing && !existing.isActive) {
  // Reactivate and update roles
  return await prisma.clubMembership.update({
    where: { id: existing.id },
    data: { isActive: true, roles }
  });
}
```
**Warning signs:** "User already member" when user was previously removed

## Code Examples

Verified patterns from existing codebase:

### Validation Schema for Membership Operations
```typescript
// src/lib/validations/membership.ts
import { z } from 'zod';

const roleEnum = z.enum(['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT']);

/**
 * Schema for adding a user to a club.
 */
export const addMembershipSchema = z.object({
  clubId: z.string().uuid('Invalid club ID'),
  userId: z.string().uuid('Invalid user ID'),
  roles: z
    .array(roleEnum)
    .min(1, 'At least one role is required')
    .default(['ATHLETE']),
});

export type AddMembershipInput = z.infer<typeof addMembershipSchema>;

/**
 * Schema for updating membership roles.
 */
export const updateMembershipSchema = z.object({
  roles: z
    .array(roleEnum)
    .min(1, 'At least one role is required'),
});

export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;

/**
 * Schema for bulk membership import CSV row.
 */
export const bulkMembershipRowSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.string().transform((val) => {
    // Support "COACH" or "COACH,ATHLETE" format
    return val.split(',').map(r => r.trim().toUpperCase());
  }).pipe(z.array(roleEnum).min(1)),
});
```

### Complete Add Membership API
```typescript
// src/app/api/admin/memberships/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { getUserById } from '@/lib/supabase/admin';
import { addMembershipSchema } from '@/lib/validations/membership';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const adminContext = await getSuperAdminContext();
    if (!adminContext) return unauthorizedResponse();

    const body = await request.json();
    const parseResult = addMembershipSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { clubId, userId, roles } = parseResult.data;

    // Verify club exists
    const club = await prisma.team.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });
    if (!club) return notFoundResponse('Club');

    // Verify user exists in Supabase
    const user = await getUserById(userId);
    if (!user) return notFoundResponse('User');

    // Check for existing membership
    const existing = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { error: 'User is already a member of this club', membershipId: existing.id },
          { status: 409 }
        );
      }
      // Reactivate inactive membership
      const updated = await prisma.clubMembership.update({
        where: { id: existing.id },
        data: { isActive: true, roles },
      });

      const audit = createAdminAuditLogger(request, adminContext.userId);
      await audit.log({
        action: 'ADMIN_MEMBERSHIP_ADDED',
        targetType: 'ClubMembership',
        targetId: updated.id,
        beforeState: { isActive: false, roles: existing.roles },
        afterState: { isActive: true, roles },
        metadata: { reactivated: true },
      });

      return NextResponse.json({ success: true, membership: updated, reactivated: true });
    }

    // Create new membership
    const membership = await prisma.clubMembership.create({
      data: { clubId, userId, roles, isActive: true },
    });

    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_MEMBERSHIP_ADDED',
      targetType: 'ClubMembership',
      targetId: membership.id,
      afterState: {
        clubId,
        clubName: club.name,
        userId,
        userEmail: user.email,
        roles,
      },
    });

    return NextResponse.json({ success: true, membership }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'admin/memberships:POST');
  }
}
```

### Membership List for User Detail Page
```typescript
// Extend existing user detail to show memberships with actions
// Source: /src/app/(admin)/admin/users/[userId]/page.tsx pattern

// In user detail page, add actions to membership list:
<div>
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold">Club Memberships ({user.clubs?.length ?? 0})</h2>
    <Button variant="outline" size="sm" onClick={() => setAddMembershipOpen(true)}>
      <Plus className="h-4 w-4 mr-2" />
      Add to Club
    </Button>
  </div>
  <MembershipListWithActions
    memberships={user.clubs?.map(m => ({
      ...m,
      onEditRoles: () => openEditDialog(m),
      onRemove: () => openRemoveDialog(m),
    })) ?? []}
  />
</div>

{/* Add to Club Dialog */}
<AddToClubDialog
  open={addMembershipOpen}
  onOpenChange={setAddMembershipOpen}
  userId={user.id}
  onSuccess={() => router.refresh()}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single role per membership | Multi-role arrays | Phase 10 (RBAC) | Schema supports `roles: Role[]` |
| Invitation required | Admin can bypass | Phase 39 (this phase) | Direct ClubMembership create |
| Manual user lookup | User search API | Phase 37 | `/api/admin/users?search=` exists |

**Deprecated/outdated:**
- `TeamMember` model: Legacy, use `ClubMembership` for new features
- Single role assumption: Always use `roles[]` array pattern

## Open Questions

None - all research questions resolved through codebase analysis.

The key decisions from CONTEXT.md that inform implementation:

1. **UI locations:** Both user detail page AND club detail page (Claude's discretion on shared components)
2. **User selection:** Search by email/name with dropdown autocomplete (use cmdk Command)
3. **Multi-role:** User can hold multiple roles simultaneously (already supported by schema)
4. **CSV import:** Skip unknown users with error, continue processing (matches Phase 37 pattern)
5. **Inline actions:** Memberships enable inline edit/remove (dropdown menu pattern)

## Sources

### Primary (HIGH confidence)
- `/home/hb/radl/prisma/schema.prisma` - ClubMembership model, Role enum
- `/home/hb/radl/src/lib/audit/actions.ts` - Pre-defined ADMIN_MEMBERSHIP_ADDED/REMOVED
- `/home/hb/radl/src/app/api/admin/users/[userId]/route.ts` - User detail with memberships pattern
- `/home/hb/radl/src/app/api/admin/clubs/[clubId]/route.ts` - Club detail with member count pattern
- `/home/hb/radl/src/components/admin/users/bulk-upload-form.tsx` - CSV import UI pattern
- `/home/hb/radl/src/hooks/use-admin-csv-parser.ts` - CSV parsing pattern
- `/home/hb/radl/src/components/ui/command.tsx` - cmdk Command component
- `/home/hb/radl/src/hooks/use-debounced-callback.ts` - Debounce hook
- `/home/hb/radl/src/components/admin/users/user-search.tsx` - Search input pattern
- `/home/hb/radl/src/components/admin/users/membership-list.tsx` - Membership table pattern

### Secondary (MEDIUM confidence)
- Phase 37 research and plans - Established admin patterns
- Phase 38 research and plans - Club management patterns
- 39-CONTEXT.md - User decisions and Claude's discretion areas

### Tertiary (LOW confidence)
- None - all findings from codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in codebase
- Architecture: HIGH - patterns established in Phases 36-38
- Pitfalls: HIGH - derived from actual schema constraints and code
- Data model: HIGH - ClubMembership schema verified directly

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (stable patterns, internal codebase)
