# RBAC-07: Role Propagation Mechanism Audit

**Date:** 2026-01-29
**Requirement:** RBAC-07 - Role changes propagate immediately to permissions
**Status:** IMPLEMENTED AND VERIFIED

## Executive Summary

RBAC-07 requires that role changes (grants, revocations, membership updates) take effect immediately without requiring the user to re-authenticate or wait for JWT refresh. The codebase achieves this through **database lookup on every request**, not relying solely on JWT claims for authorization.

**Finding:** IMPLEMENTED. The system queries `prisma.clubMembership` and `prisma.permissionGrant` on every API request, ensuring role changes propagate immediately.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Request Flow                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐      ┌──────────────────┐      ┌────────────────────┐        │
│   │ Request  │─────▶│ getAuthContext() │─────▶│ getClaimsForApiRoute│        │
│   └──────────┘      └──────────────────┘      └─────────┬──────────┘        │
│                                                         │                    │
│                                                         ▼                    │
│                              ┌───────────────────────────────────────────┐   │
│                              │          Step 1: JWT Validation           │   │
│                              │  supabase.auth.getUser() - Identity only  │   │
│                              └───────────────────────────────────────────┘   │
│                                                         │                    │
│                                                         ▼                    │
│                              ┌───────────────────────────────────────────┐   │
│                              │      Step 2: Club Context (Cookie)        │   │
│                              │        getCurrentClubId() - Club ID       │   │
│                              └───────────────────────────────────────────┘   │
│                                                         │                    │
│                                                         ▼                    │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                   Step 3: DATABASE LOOKUP #1                          │   │
│   │         prisma.clubMembership.findFirst({ clubId, userId })          │   │
│   │              ─────▶ Gets BASE ROLES from database                    │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                         │                    │
│                                                         ▼                    │
│   ┌──────────────────────────────────────────────────────────────────────┐   │
│   │                   Step 4: DATABASE LOOKUP #2                          │   │
│   │      getUserEffectiveRoles() ─▶ prisma.permissionGrant.findMany()    │   │
│   │         ─────▶ Gets ACTIVE GRANTS (not expired, not revoked)         │   │
│   └──────────────────────────────────────────────────────────────────────┘   │
│                                                         │                    │
│                                                         ▼                    │
│                              ┌───────────────────────────────────────────┐   │
│                              │      Step 5: Merge Effective Roles        │   │
│                              │  baseRoles + grantedRoles (deduplicated)  │   │
│                              └───────────────────────────────────────────┘   │
│                                                         │                    │
│                                                         ▼                    │
│                              ┌───────────────────────────────────────────┐   │
│                              │    Step 6: Create CASL Ability            │   │
│                              │  defineAbilityFor({ roles, ... })         │   │
│                              └───────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Code Paths

### 1. getClaimsForApiRoute() - src/lib/auth/claims.ts

```typescript
// Line 128-146: Database lookup for base roles
if (clubId) {
  const membership = await prisma.clubMembership.findFirst({
    where: {
      clubId,
      userId: user.id,
      isActive: true,
    },
  });

  if (membership) {
    // Get effective roles including any temporary grants
    const effectiveRoles = await getUserEffectiveRoles(
      user.id,
      clubId,
      membership.roles as Role[]
    );
    roles = effectiveRoles.map(r => r.toString());
  }
}
```

**Analysis:** Roles are NOT read from JWT. They are fetched from `clubMembership` table on every request. This ensures:
- Role changes to ClubMembership table take effect immediately
- isActive flag changes take effect immediately

### 2. getUserEffectiveRoles() - src/lib/auth/permission-grant.ts

```typescript
// Line 131-145: Merge base roles with temporary grants
export async function getUserEffectiveRoles(
  userId: string,
  clubId: string,
  baseRoles: Role[]
): Promise<Role[]> {
  const grants = await getActiveGrants(userId, clubId);

  if (grants.length === 0) {
    return baseRoles;
  }

  // Merge granted roles with base roles
  const grantedRoles = grants.flatMap(g => g.roles);
  return [...new Set([...baseRoles, ...grantedRoles])];
}
```

**Analysis:** Temporary grants are queried from database and merged with base roles. Grant revocation (setting revokedAt) or expiration (expiresAt < now) takes effect immediately.

### 3. getActiveGrants() - src/lib/auth/permission-grant.ts

```typescript
// Line 78-93: Query for active (non-expired, non-revoked) grants
export async function getActiveGrants(
  userId: string,
  clubId: string
): Promise<PermissionGrantWithDetails[]> {
  const grants = await prisma.permissionGrant.findMany({
    where: {
      userId,
      clubId,
      expiresAt: { gt: new Date() },  // Not expired
      revokedAt: null,                // Not revoked
    },
    orderBy: { expiresAt: 'asc' },
  });
  return grants;
}
```

**Analysis:** The query explicitly filters:
- `expiresAt: { gt: new Date() }` - Excludes expired grants
- `revokedAt: null` - Excludes revoked grants

## Immediate Propagation Scenarios

### Scenario 1: Admin Promotes User to Coach

```
Before: User has ATHLETE role in ClubMembership
Action: Admin updates ClubMembership.roles = ['ATHLETE', 'COACH']
After:  Next API request immediately sees COACH role
        (prisma.clubMembership.findFirst returns updated roles)
```

### Scenario 2: Admin Grants Temporary Coach Access

```
Before: User has ATHLETE role
Action: Admin creates PermissionGrant with roles: ['COACH']
After:  Next API request includes COACH in effective roles
        (getUserEffectiveRoles merges grant with base roles)
```

### Scenario 3: Grant Revocation

```
Before: User has COACH via PermissionGrant
Action: Admin calls revokeGrant() setting revokedAt = now
After:  Next API request excludes COACH
        (getActiveGrants filters out revokedAt != null)
```

### Scenario 4: Grant Expiration

```
Before: User has COACH via PermissionGrant (expires in 1 hour)
Action: 1 hour passes
After:  Next API request excludes COACH
        (getActiveGrants filters out expiresAt < now)
```

### Scenario 5: Membership Deactivation

```
Before: User has COACH role via active membership
Action: Admin sets ClubMembership.isActive = false
After:  Next API request finds no membership
        (isActive: true filter excludes deactivated)
```

## JWT vs Database Authorization

| Aspect | JWT-Only (Insecure) | RowOps Implementation (Secure) |
|--------|---------------------|-------------------------------|
| Role source | JWT claims | Database query |
| Propagation delay | Until JWT refresh (~1 hour) | Immediate |
| Revocation | Must wait for token expiry | Immediate |
| Temporary grants | Not supported | Supported via PermissionGrant |
| Performance | Fast (no DB call) | 2 DB queries per request |
| Security | Vulnerable | Robust |

**Design Decision:** The system prioritizes security over performance. Two database queries per request (ClubMembership + PermissionGrant) is acceptable overhead for immediate role propagation.

## Test Coverage

Tests added in `src/__tests__/auth/role-propagation.test.ts`:

| Test | What It Verifies |
|------|------------------|
| Database lookup per call | `prisma.permissionGrant.findMany` called each time |
| Base roles returned | When no grants, returns ClubMembership.roles |
| Grants merged | Active grants merged with base roles |
| Deduplication | Overlapping roles deduplicated via Set |
| Multiple grants | Multiple active grants all merged |
| Expired exclusion | Query filters expiresAt > now |
| Revoked exclusion | Query filters revokedAt = null |
| No caching | Multiple calls = multiple queries |
| Immediate grant propagation | Grant created -> next call sees role |
| Immediate revocation | Grant revoked -> next call loses role |

**Test Results:** 17 tests passing

## Verification Checklist

- [x] **Database lookup on every request:** Confirmed via code review (lines 128-146 in claims.ts)
- [x] **ClubMembership roles fetched fresh:** findFirst with no caching layer
- [x] **Temporary grants included:** getUserEffectiveRoles merges grants
- [x] **Expired grants excluded:** expiresAt filter in query
- [x] **Revoked grants excluded:** revokedAt filter in query
- [x] **No JWT-only authorization:** JWT used for identity, not roles
- [x] **Test coverage:** 17 unit tests verifying mechanism

## RBAC-07 Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Role changes propagate immediately | Database lookup per request | PASS |
| No JWT-only role checking | Roles from ClubMembership table | PASS |
| Temporary grants supported | PermissionGrant table + merge | PASS |
| Grant revocation immediate | revokedAt filter on query | PASS |
| Grant expiration immediate | expiresAt filter on query | PASS |

## Conclusion

**RBAC-07: IMPLEMENTED AND VERIFIED**

The RowOps system implements immediate role propagation through database lookups on every request. This design ensures:

1. Role changes to ClubMembership take effect immediately
2. Temporary permission grants are merged with base roles
3. Grant revocations and expirations are enforced immediately
4. No caching layer delays role updates

The mechanism is documented, tested, and confirmed working via 17 unit tests.
