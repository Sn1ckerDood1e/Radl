# Phase 37: User Management - Research

**Researched:** 2026-01-30
**Domain:** Super Admin User Management (Supabase Admin API + Prisma)
**Confidence:** HIGH

## Summary

Phase 37 implements super admin user management capabilities. Users are stored in Supabase `auth.users` while their memberships and profile data are in Prisma models (`ClubMembership`, `FacilityMembership`). The Supabase Admin API (`auth.admin.*`) provides all necessary methods for user lifecycle management including creation, password reset, and deactivation via `ban_duration`.

**Primary recommendation:** Use Supabase Admin API for auth operations (create, ban, password reset) and Prisma for querying membership data. Search users by joining `auth.users` email with `ClubMembership`/`FacilityMembership` relations. Use `ban_duration` with `'876000h'` (100 years) for deactivation instead of a custom flag.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.93.3 | Admin API client | Already configured, `getSupabaseAdmin()` exists |
| Prisma | ^6.0.0 | Database queries | Bypass RLS for admin operations |
| papaparse | ^5.5.3 | CSV parsing | Already used for bulk invitations |
| react-hook-form | ^7.71.1 | Form validation | Existing pattern with mode: 'onTouched' |
| zod | ^4.3.5 | Schema validation | Existing validation pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.562.0 | Icons | User management UI icons |
| sonner | ^2.0.7 | Toast notifications | Action feedback |
| date-fns | ^4.1.0 | Date formatting | Last login, created date display |

### No New Libraries Needed
The codebase already has all required dependencies:
- CSV parsing: `papaparse` with types, `useCSVParser` hook exists
- UI components: `Dialog`, `Button`, `Input`, `FormField` from shadcn/ui
- Progress feedback: `ProgressIndicator` component exists

## Architecture Patterns

### User Data Model

User data spans two systems:

1. **Supabase `auth.users`** (authentication)
   - `id` - User UUID (primary identifier)
   - `email` - User email
   - `user_metadata` - Custom data (name, phone stored here)
   - `created_at` - Account creation timestamp
   - `last_sign_in_at` - Last login timestamp
   - `banned_until` - Deactivation timestamp (null = active)

2. **Prisma Application Tables** (authorization/profile)
   - `ClubMembership` - User's club memberships with roles
   - `FacilityMembership` - User's facility memberships
   - `TeamMember` - Legacy membership model
   - `AthleteProfile` - Extended profile data (optional)

### API Route Structure

```
src/app/api/admin/
  users/
    route.ts          # GET: List/search users, POST: Create user
    [userId]/
      route.ts        # GET: User details, PATCH: Edit user
      deactivate/
        route.ts      # POST: Deactivate user
      reactivate/
        route.ts      # POST: Reactivate user
      reset-password/
        route.ts      # POST: Send password reset link
  users/bulk/
    route.ts          # POST: Bulk create users from CSV
```

### Page Structure

```
src/app/(admin)/
  admin/users/
    page.tsx              # User list with pagination/search
    [userId]/
      page.tsx            # User details view
    new/
      page.tsx            # Create user form
    bulk/
      page.tsx            # Bulk CSV upload
```

### Component Structure

```
src/components/admin/users/
  user-list-table.tsx     # Paginated user table
  user-search-bar.tsx     # Search by email/name/facility/club
  user-row-actions.tsx    # Dropdown: Edit, Deactivate, Reset Password
  user-detail-card.tsx    # User profile card
  user-memberships.tsx    # List of user's memberships
  create-user-form.tsx    # Create single user form
  bulk-user-import.tsx    # CSV upload with preview
  deactivate-dialog.tsx   # Confirmation dialog for deactivation
```

### Pattern 1: Supabase Admin Client Usage

**Source:** `src/lib/supabase/admin.ts` (existing)

```typescript
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Get admin client (requires SUPABASE_SERVICE_ROLE_KEY)
const supabase = getSupabaseAdmin();
if (!supabase) {
  throw new Error('Admin client not available');
}

// Create user without confirmation email
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  email_confirm: true, // Auto-confirm since admin is creating
  user_metadata: { name: 'User Name', phone: '+1234567890' },
});

// Deactivate user (ban for 100 years)
const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  ban_duration: '876000h', // ~100 years
});

// Reactivate user
const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  ban_duration: 'none',
});

// Generate password reset link
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: 'user@example.com',
});
```

### Pattern 2: Pagination with Offset

**Source:** `src/app/api/audit-logs/route.ts` (existing pattern)

```typescript
// Parse pagination params
const { searchParams } = new URL(request.url);
const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);
const offset = parseInt(searchParams.get('offset') ?? '0');

// Query with pagination
const [items, total] = await Promise.all([
  prisma.model.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  }),
  prisma.model.count({ where }),
]);

// Return paginated response
return NextResponse.json({
  items,
  total,
  limit,
  offset,
  hasMore: offset + items.length < total,
});
```

### Pattern 3: User Search Implementation

Search must query both Supabase auth.users AND Prisma memberships:

```typescript
// Step 1: List all users from Supabase (max 1000 per call)
const { data: { users }, error } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

// Step 2: Get all memberships from Prisma
const memberships = await prisma.clubMembership.findMany({
  where: { isActive: true },
  include: {
    club: {
      include: { facility: true },
    },
  },
});

// Step 3: Join and filter in application code
const userMap = new Map(users.map(u => [u.id, u]));
const membershipMap = new Map<string, typeof memberships[0][]>();
memberships.forEach(m => {
  const existing = membershipMap.get(m.userId) || [];
  existing.push(m);
  membershipMap.set(m.userId, existing);
});

// Step 4: Apply search filters
const filtered = users.filter(user => {
  const email = user.email?.toLowerCase() || '';
  const name = (user.user_metadata?.name as string)?.toLowerCase() || '';
  const userMemberships = membershipMap.get(user.id) || [];

  // Match search query
  if (query) {
    const q = query.toLowerCase();
    if (!email.includes(q) && !name.includes(q)) {
      // Check facility/club names
      const matchesFacilityOrClub = userMemberships.some(m =>
        m.club.name.toLowerCase().includes(q) ||
        m.club.facility?.name.toLowerCase().includes(q)
      );
      if (!matchesFacilityOrClub) return false;
    }
  }

  return true;
});
```

### Pattern 4: Bulk CSV Import

**Source:** `src/hooks/use-csv-parser.ts`, `src/components/forms/csv-import-form.tsx`

```typescript
// CSV validation schema for user import
const bulkUserSchema = z.object({
  users: z.array(z.object({
    email: z.string().email('Invalid email'),
    name: z.string().min(1, 'Name required').optional(),
    role: z.enum(['ATHLETE', 'COACH', 'PARENT']).optional(),
  })),
});

// API response structure for partial failures
interface BulkCreateResult {
  created: number;
  failed: Array<{ email: string; reason: string }>;
}

// Process each user with error handling
for (const row of users) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: row.email,
      email_confirm: true,
      user_metadata: { name: row.name },
    });

    if (error) {
      result.failed.push({ email: row.email, reason: error.message });
    } else {
      // Send invite email
      await supabase.auth.admin.inviteUserByEmail(row.email);
      result.created++;
    }
  } catch (err) {
    result.failed.push({ email: row.email, reason: 'Unknown error' });
  }
}
```

### Pattern 5: Audit Logging for Admin Actions

**Source:** `src/lib/audit/logger.ts`

```typescript
import { createAdminAuditLogger } from '@/lib/audit/logger';

// In API route
const audit = createAdminAuditLogger(request, adminContext.userId);

// Log user creation
await audit.log({
  action: 'ADMIN_USER_CREATED',
  targetType: 'User',
  targetId: newUser.id,
  afterState: { email: newUser.email, name: newUser.user_metadata?.name },
});

// Log deactivation with before/after
await audit.log({
  action: 'ADMIN_USER_DEACTIVATED',
  targetType: 'User',
  targetId: userId,
  beforeState: { banned_until: null, email: user.email },
  afterState: { banned_until: new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000), email: user.email },
});
```

### Anti-Patterns to Avoid

- **Storing user profile in Prisma:** User name/phone should go in `user_metadata` in Supabase auth, not a separate Prisma table. This keeps auth data together and simplifies queries.

- **Deleting users instead of deactivating:** Always use `ban_duration` for deactivation. This preserves data for audit trails and allows reactivation.

- **Trusting client-side for admin status:** Always use `getSuperAdminContext()` which verifies against the database, never JWT claims alone.

- **Sending raw passwords:** Use `inviteUserByEmail()` or `generateLink({ type: 'recovery' })` to let users set their own passwords.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom parser | `papaparse` + `useCSVParser` hook | Already implemented, handles edge cases |
| User creation | Direct auth.users insert | `auth.admin.createUser()` | Handles password hashing, metadata, etc. |
| Password reset emails | Custom email service | `auth.admin.inviteUserByEmail()` | Integrates with Supabase email templates |
| User deactivation | Custom `isActive` flag | `ban_duration` parameter | Built into Supabase, blocks login automatically |
| Pagination UI | Custom pagination | Offset-based pattern (existing) | Consistent with audit-logs API |

**Key insight:** Supabase Admin API handles all auth complexity. Don't build custom user management when `auth.admin.*` methods exist.

## Common Pitfalls

### Pitfall 1: Supabase listUsers Pagination Limit

**What goes wrong:** `listUsers()` returns max 1000 users per call. Large platforms hit this limit.

**Why it happens:** Supabase Admin API design limitation for performance.

**How to avoid:** Implement client-side filtering and pagination. For platforms with 1000+ users, consider caching user list or implementing multi-page fetching:
```typescript
// Fetch multiple pages if needed
const allUsers: User[] = [];
let page = 1;
while (true) {
  const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  allUsers.push(...data.users);
  if (data.users.length < 1000) break;
  page++;
}
```

**Warning signs:** Users not appearing in list, inconsistent counts.

### Pitfall 2: ban_duration Format

**What goes wrong:** Invalid `ban_duration` format causes silent failures.

**Why it happens:** Format must be Go duration string (e.g., `'876000h'` not `'100y'`).

**How to avoid:** Use hours format: `'876000h'` for ~100 years. Use `'none'` to remove ban.

**Warning signs:** User still able to log in after "deactivation".

### Pitfall 3: user_metadata vs app_metadata

**What goes wrong:** Sensitive data stored in `user_metadata` is visible to the user.

**Why it happens:** `user_metadata` is included in JWT and accessible client-side.

**How to avoid:**
- `user_metadata`: User-editable info (name, phone, preferences)
- `app_metadata`: Admin-only info (internal notes, admin flags)

**Warning signs:** Users seeing admin notes or internal flags.

### Pitfall 4: Email Already Exists

**What goes wrong:** `createUser()` fails silently or with unclear error when email exists.

**Why it happens:** Supabase doesn't provide clear duplicate detection.

**How to avoid:** Pre-check email existence before creation:
```typescript
// Check if user exists first
const { data: existingUsers } = await supabase.auth.admin.listUsers();
const exists = existingUsers.users.some(u => u.email === newEmail);
if (exists) {
  return { error: 'Email already registered' };
}
```

**Warning signs:** Confusing error messages during bulk import.

### Pitfall 5: Missing Invite Email After createUser

**What goes wrong:** User created but never receives password setup email.

**Why it happens:** `createUser()` does NOT send emails. Must call `inviteUserByEmail()` separately.

**How to avoid:** Always follow createUser with inviteUserByEmail:
```typescript
const { data: user } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
  user_metadata: { name },
});

// CRITICAL: Send invite email for password setup
await supabase.auth.admin.inviteUserByEmail(email);
```

**Warning signs:** Users complaining they never received password setup email.

## Code Examples

### Complete User Creation Flow

```typescript
// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // 1. Verify super admin
  const adminContext = await getSuperAdminContext();
  if (!adminContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get admin client
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 });
  }

  // 3. Validate input
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name, phone } = parsed.data;

  // 4. Create user
  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name, phone },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // 5. Send password setup email
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteError) {
    console.error('Failed to send invite email:', inviteError);
    // User created but email failed - log but don't fail request
  }

  // 6. Audit log
  const audit = createAdminAuditLogger(request, adminContext.userId);
  await audit.log({
    action: 'ADMIN_USER_CREATED',
    targetType: 'User',
    targetId: user.user.id,
    afterState: { email, name, phone },
  });

  return NextResponse.json({ user: user.user }, { status: 201 });
}
```

### User Deactivation

```typescript
// src/app/api/admin/users/[userId]/deactivate/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const adminContext = await getSuperAdminContext();
  if (!adminContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 });
  }

  // Get current user state for audit
  const { data: beforeUser } = await supabase.auth.admin.getUserById(userId);
  if (!beforeUser.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Deactivate: ban for ~100 years
  const { data: afterUser, error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Audit log with before/after
  const audit = createAdminAuditLogger(request, adminContext.userId);
  await audit.log({
    action: 'ADMIN_USER_DEACTIVATED',
    targetType: 'User',
    targetId: userId,
    beforeState: {
      email: beforeUser.user.email,
      banned_until: beforeUser.user.banned_until,
    },
    afterState: {
      email: afterUser.user.email,
      banned_until: afterUser.user.banned_until,
    },
  });

  return NextResponse.json({ success: true, user: afterUser.user });
}
```

### User Search Implementation

```typescript
// Helper to join Supabase users with Prisma memberships
export async function searchUsers(query?: string, page = 1, perPage = 25) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Admin client unavailable');

  // Get all users from Supabase
  const { data: authData, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000, // Fetch all for search
  });

  if (error) throw error;

  // Get all memberships with club/facility info
  const memberships = await prisma.clubMembership.findMany({
    include: {
      club: {
        select: {
          id: true,
          name: true,
          slug: true,
          facility: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  // Group memberships by userId
  const membershipsByUser = new Map<string, typeof memberships>();
  memberships.forEach(m => {
    const existing = membershipsByUser.get(m.userId) || [];
    existing.push(m);
    membershipsByUser.set(m.userId, existing);
  });

  // Filter users
  let filtered = authData.users;
  if (query) {
    const q = query.toLowerCase();
    filtered = authData.users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const name = (user.user_metadata?.name as string)?.toLowerCase() || '';

      if (email.includes(q) || name.includes(q)) return true;

      // Check memberships
      const userMemberships = membershipsByUser.get(user.id) || [];
      return userMemberships.some(m =>
        m.club.name.toLowerCase().includes(q) ||
        m.club.facility?.name.toLowerCase().includes(q)
      );
    });
  }

  // Paginate
  const total = filtered.length;
  const offset = (page - 1) * perPage;
  const paginated = filtered.slice(offset, offset + perPage);

  // Enrich with membership data
  const enriched = paginated.map(user => ({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name as string | undefined,
    phone: user.user_metadata?.phone as string | undefined,
    createdAt: user.created_at,
    lastSignIn: user.last_sign_in_at,
    isDeactivated: user.banned_until ? new Date(user.banned_until) > new Date() : false,
    memberships: membershipsByUser.get(user.id)?.map(m => ({
      clubId: m.clubId,
      clubName: m.club.name,
      clubSlug: m.club.slug,
      facilityName: m.club.facility?.name,
      roles: m.roles,
      isActive: m.isActive,
    })) || [],
  }));

  return {
    users: enriched,
    total,
    page,
    perPage,
    hasMore: offset + paginated.length < total,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom `isActive` flag | `ban_duration` parameter | Supabase 2.0+ | Blocks login automatically |
| Manual email sending | `inviteUserByEmail()` | Always | Uses Supabase email templates |
| Direct auth.users SQL | Admin API methods | Always | Proper password hashing, metadata |

**Deprecated/outdated:**
- Direct SQL manipulation of `auth.users`: Use Admin API
- Custom user profile tables: Use `user_metadata` in Supabase auth

## Open Questions

None - all research questions resolved.

## Sources

### Primary (HIGH confidence)
- [Supabase auth.admin.createUser docs](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase auth.admin.updateUserById docs](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
- [Supabase auth.admin.listUsers docs](https://supabase.com/docs/reference/javascript/auth-admin-listusers)
- [Supabase auth.admin.generateLink docs](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Supabase auth.admin.inviteUserByEmail docs](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- `/home/hb/radl/src/lib/supabase/admin.ts` - Existing admin client setup
- `/home/hb/radl/src/lib/audit/logger.ts` - Existing audit logging pattern
- `/home/hb/radl/src/lib/auth/admin-authorize.ts` - Existing admin authorization

### Secondary (MEDIUM confidence)
- [Supabase discussion: banning users](https://github.com/orgs/supabase/discussions/9239)
- [Banning users with Supabase (hashnode)](https://eichgi.hashnode.dev/banning-users-with-supabase)
- `/home/hb/radl/src/hooks/use-csv-parser.ts` - Existing CSV parsing pattern
- `/home/hb/radl/src/app/api/audit-logs/route.ts` - Existing pagination pattern

## Metadata

**Confidence breakdown:**
- Supabase Admin API: HIGH - Official documentation verified
- User data model: HIGH - Codebase analysis confirms architecture
- CSV bulk upload: HIGH - Existing pattern in codebase
- Pagination: HIGH - Existing pattern in codebase
- Search implementation: MEDIUM - Requires joining two data sources

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (Supabase API stable)
