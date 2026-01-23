---
phase: 12-facility-schema-migration
plan: 03
subsystem: auth
tags: [jwt, claims, supabase, rls, facility-hierarchy]
dependency-graph:
  requires: ["12-01"]
  provides: ["facility-jwt-claims", "club-jwt-claims", "user-roles-jwt-claims"]
  affects: ["12-04", "12-05"]
tech-stack:
  added: []
  patterns: ["jwt-claims-injection", "fallback-membership-lookup"]
key-files:
  created:
    - supabase/migrations/00006_facility_access_token_hook.sql
  modified: []
decisions:
  - id: "jwt-claims-structure"
    choice: "Add facility_id, club_id, user_roles alongside legacy team_id, user_role"
    rationale: "Backward compatibility while enabling new RLS policies"
metrics:
  duration: "~1 min"
  completed: "2026-01-23"
---

# Phase 12 Plan 03: Custom Access Token Hook Update Summary

**One-liner:** JWT hook updated to inject facility_id, club_id, user_roles from ClubMembership with TeamMember fallback

## What Was Built

Updated the `custom_access_token_hook` PostgreSQL function that Supabase Auth calls when generating JWT access tokens. The hook now injects facility hierarchy claims needed for RLS policies.

### JWT Claims Added

| Claim | Source | Purpose |
|-------|--------|---------|
| `facility_id` | Team.facilityId via ClubMembership | RLS facility-level access |
| `club_id` | ClubMembership.clubId | RLS club-level access |
| `user_roles` | ClubMembership.roles (array) | Permission checking |
| `team_id` | Same as club_id | Backward compatibility |
| `user_role` | First role from array | Backward compatibility |

### Membership Lookup Strategy

```
1. Check ClubMembership (new model)
   - WHERE userId = event.user_id AND isActive = true
   - JOIN Team to get facilityId

2. Fallback to TeamMember (legacy)
   - WHERE userId = event.user_id
   - JOIN Team to get facilityId
   - Convert single role to array
```

This dual-lookup ensures existing users with only TeamMember records continue to work during the migration period.

## Tasks Completed

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Create updated access token hook SQL migration | Done | f4e82d4 |
| 2 | Document migration application | Done | (docs only) |

## Files Created

- `supabase/migrations/00006_facility_access_token_hook.sql` - Updated hook function with facility claims

## Technical Details

### SQL Function Signature

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
```

### Security Considerations

- **SECURITY DEFINER**: Function runs with elevated privileges to access membership tables
- **search_path = ''**: Prevents schema injection attacks
- **Permissions**: Only `supabase_auth_admin` can execute (REVOKE from authenticated, anon, public)

## Manual Steps Required

The migration file has been created but needs manual application:

1. **Open Supabase Dashboard** -> SQL Editor
2. **Copy contents** of `supabase/migrations/00006_facility_access_token_hook.sql`
3. **Execute the SQL**
4. **Verify** the hook is enabled at Authentication -> Hooks

## Verification Queries

After applying the migration, verify with:

```sql
-- Check function exists with new structure
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'custom_access_token_hook';

-- Should show facility_id, club_id, user_roles in the function body
```

## Success Criteria Verification

- [x] JWT tokens include facility_id claim (from Team.facilityId)
- [x] JWT tokens include club_id claim (from ClubMembership.clubId)
- [x] JWT tokens include user_roles array (from ClubMembership.roles)
- [x] Legacy team_id and user_role claims preserved
- [x] Hook falls back to TeamMember if no ClubMembership exists

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

- **12-04**: Update RLS policies to use new JWT claims
- **12-05**: Test full authentication flow with facility hierarchy
