# JWT Claims Audit

**Phase:** 26-rbac-tenant-isolation
**Plan:** 06
**Requirement:** ISOL-04 - JWT claims match data access patterns
**Date:** 2026-01-29

## Executive Summary

This audit traces the complete JWT claim lifecycle from login through RLS policy evaluation. The custom access token hook correctly injects tenant context (facility_id, club_id, user_roles) into JWT claims, and RLS helper functions correctly read these claims for policy evaluation.

**Status:** ISOL-04 PASS - JWT claims correctly map to data access patterns.

---

## 1. JWT Claim Lifecycle

### 1.1 Custom Access Token Hook

**Source:** `supabase/migrations/00006_facility_access_token_hook.sql`

The `custom_access_token_hook` function is called by Supabase Auth when generating access tokens. It injects tenant context claims:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
```

**Claims Added:**

| Claim | Type | Source | Description |
|-------|------|--------|-------------|
| `facility_id` | text (UUID) | Team.facilityId via ClubMembership | User's facility context |
| `club_id` | text (UUID) | ClubMembership.clubId | User's current club |
| `team_id` | text (UUID) | Same as club_id | Backward compatibility alias |
| `user_roles` | text[] | ClubMembership.roles | Array of roles in current club |
| `user_role` | text | user_roles[1] | First role (backward compatibility) |

**Claim Population Logic:**

1. Query `ClubMembership` + `Team` for active membership
2. If no ClubMembership found, fall back to legacy `TeamMember` table
3. Set null values for users without membership

```sql
SELECT
  t."facilityId",    -- -> facility_id claim
  cm."clubId",       -- -> club_id claim
  cm.roles           -- -> user_roles claim
FROM public."ClubMembership" cm
JOIN public."Team" t ON t.id = cm."clubId"
WHERE cm."userId" = (event->>'user_id')
  AND cm."isActive" = true
```

### 1.2 RLS Helper Functions

**Source:** `supabase/migrations/00005_facility_rls_helpers.sql`

Helper functions read JWT claims via `current_setting('request.jwt.claims', true)`:

| Function | Returns | Reads Claim | Pattern |
|----------|---------|-------------|---------|
| `get_current_facility_id()` | text | `facility_id` | `request.jwt.claims ->> 'facility_id'` |
| `get_current_club_id()` | text | `club_id` | `request.jwt.claims ->> 'club_id'` |
| `get_current_team_id()` | text | `club_id` | Calls `get_current_club_id()` |
| `has_role(text)` | boolean | `user_roles` | `request.jwt.claims -> 'user_roles'` |
| `has_any_role(text[])` | boolean | `user_roles` | Calls `has_role()` |
| `is_facility_admin()` | boolean | `user_roles` | `has_role('FACILITY_ADMIN')` |
| `is_club_admin_or_higher()` | boolean | `user_roles` | `has_any_role(['FACILITY_ADMIN', 'CLUB_ADMIN'])` |
| `is_coach_or_higher()` | boolean | `user_roles` | `has_any_role(['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH'])` |

**Key Implementation Details:**

- All functions use `SECURITY DEFINER` and `SET search_path = ''` for safety
- Functions return `text` to match Prisma's UUID storage format
- `NULLIF()` handles empty string claims gracefully
- `COALESCE()` provides safe defaults for missing claims

### 1.3 RLS Policy Usage

**Source:** `supabase/migrations/00008_facility_rls_policies.sql`

RLS policies use helper functions to filter data based on JWT claims:

#### Facility Table (4 policies)

| Policy | Operation | Helper Function Used |
|--------|-----------|---------------------|
| `facility_select` | SELECT | `get_current_facility_id()` |
| `facility_update` | UPDATE | `get_current_facility_id()`, `is_facility_admin()` |
| `facility_insert` | INSERT | `is_facility_admin()` |
| `facility_delete` | DELETE | `get_current_facility_id()`, `is_facility_admin()` |

#### FacilityMembership Table (5 policies)

| Policy | Operation | Helper Function Used |
|--------|-----------|---------------------|
| `facility_membership_select` | SELECT | `get_current_facility_id()`, `is_facility_admin()` |
| `facility_membership_select_own` | SELECT | `auth.uid()` (direct, not claim-based) |
| `facility_membership_insert` | INSERT | `get_current_facility_id()`, `is_facility_admin()` |
| `facility_membership_update` | UPDATE | `get_current_facility_id()`, `is_facility_admin()` |
| `facility_membership_delete` | DELETE | `get_current_facility_id()`, `is_facility_admin()` |

#### Equipment Table (4 policies)

| Policy | Operation | Helper Functions Used |
|--------|-----------|----------------------|
| `equipment_select_hierarchical` | SELECT | `get_current_club_id()`, `get_current_facility_id()` |
| `equipment_insert_hierarchical` | INSERT | `get_current_club_id()`, `get_current_facility_id()`, `is_coach_or_higher()`, `is_club_admin_or_higher()`, `is_facility_admin()` |
| `equipment_update_hierarchical` | UPDATE | `get_current_club_id()`, `get_current_facility_id()`, `is_coach_or_higher()`, `is_club_admin_or_higher()`, `is_facility_admin()` |
| `equipment_delete_hierarchical` | DELETE | `get_current_club_id()`, `get_current_facility_id()`, `is_coach_or_higher()`, `is_club_admin_or_higher()`, `is_facility_admin()` |

---

## 2. Claim-Policy Alignment Verification

### 2.1 Alignment Table

| Claim | RLS Function | Policies Using | Data Column | Match? |
|-------|--------------|----------------|-------------|--------|
| `facility_id` | `get_current_facility_id()` | facility_select, facility_update, facility_delete, facility_membership_*, equipment_*_hierarchical | `Facility.id`, `FacilityMembership.facilityId`, `Equipment.facilityId` | YES |
| `club_id` | `get_current_club_id()` | equipment_*_hierarchical | `Equipment.clubId`, `Equipment.teamId` | YES |
| `club_id` | `get_current_team_id()` | equipment_*_hierarchical | `Equipment.teamId` | YES |
| `user_roles` | `has_role()` | (via convenience functions) | N/A (authorization check) | YES |
| `user_roles` | `is_facility_admin()` | facility_update, facility_insert, facility_delete, facility_membership_* | N/A (authorization check) | YES |
| `user_roles` | `is_club_admin_or_higher()` | equipment_*_hierarchical (CLUB-owned) | N/A (authorization check) | YES |
| `user_roles` | `is_coach_or_higher()` | equipment_*_hierarchical (TEAM-owned) | N/A (authorization check) | YES |

### 2.2 Verification Summary

All claims are correctly:
1. **Set** by the custom_access_token_hook using proper data sources
2. **Read** by RLS helper functions using `current_setting('request.jwt.claims', true)`
3. **Used** by RLS policies to filter rows based on tenant context

**No mismatches found.**

---

## 3. Detailed Claim Flow Analysis

### 3.1 Facility ID Claim Flow

```
Login                           RLS Evaluation
  |                                   |
  v                                   v
custom_access_token_hook        get_current_facility_id()
  |                                   |
  | SELECT t."facilityId"             | current_setting('request.jwt.claims', true)
  | FROM Team t                       |   ->> 'facility_id'
  | JOIN ClubMembership cm            |
  |   ON t.id = cm."clubId"           |
  |                                   v
  v                             RLS Policy Check:
claims['facility_id'] = UUID    "Facility".id = get_current_facility_id()
```

### 3.2 Club ID Claim Flow

```
Login                           RLS Evaluation
  |                                   |
  v                                   v
custom_access_token_hook        get_current_club_id()
  |                                   |
  | SELECT cm."clubId"                | current_setting('request.jwt.claims', true)
  | FROM ClubMembership cm            |   ->> 'club_id'
  |                                   |
  v                                   v
claims['club_id'] = UUID        RLS Policy Check:
                                "Equipment"."clubId" = get_current_club_id()
```

### 3.3 User Roles Claim Flow

```
Login                           RLS Evaluation
  |                                   |
  v                                   v
custom_access_token_hook        has_role(required_role)
  |                                   |
  | SELECT cm.roles                   | current_setting('request.jwt.claims', true)
  | FROM ClubMembership cm            |   -> 'user_roles'
  |                                   | jsonb_array_elements_text(...)
  v                                   |
claims['user_roles'] =          required_role = ANY(roles_array)
  ['COACH', 'ATHLETE']                |
                                      v
                                is_facility_admin() -> has_role('FACILITY_ADMIN')
                                is_club_admin_or_higher() -> has_any_role([...])
                                is_coach_or_higher() -> has_any_role([...])
```

---

## 4. Security Properties

### 4.1 Claim Immutability

- JWT claims are signed by Supabase Auth
- Claims cannot be modified after token issuance
- `current_setting()` reads claims from the request context (immutable)

### 4.2 Connection Pooling Safety

- Helper functions use `current_setting('request.jwt.claims', true)`
- The `true` parameter returns NULL if setting doesn't exist (instead of error)
- Safe with Supavisor transaction-mode connection pooling

### 4.3 Secure Function Design

All helper functions:
- Use `SECURITY DEFINER` (run with owner privileges)
- Set `search_path = ''` (prevent schema injection)
- Are `STABLE` (results consistent within transaction)

---

## 5. ISOL-04 Verification Result

| Check | Status | Evidence |
|-------|--------|----------|
| JWT claims include facility_id | PASS | `custom_access_token_hook` line 49-53 |
| JWT claims include club_id | PASS | `custom_access_token_hook` line 55-63 |
| JWT claims include user_roles | PASS | `custom_access_token_hook` line 65-74 |
| RLS helpers read facility_id | PASS | `get_current_facility_id()` reads `request.jwt.claims ->> 'facility_id'` |
| RLS helpers read club_id | PASS | `get_current_club_id()` reads `request.jwt.claims ->> 'club_id'` |
| RLS helpers read user_roles | PASS | `has_role()` reads `request.jwt.claims -> 'user_roles'` |
| Policies use correct helpers | PASS | All policies use appropriate helper functions |
| No mismatches in claim chain | PASS | Full alignment verified in Section 2 |

**ISOL-04 Status: PASS**

---

## 6. Recommendations

### 6.1 Current State Assessment

The JWT claim architecture is well-designed:

1. **Single source of truth** - Claims set once at login via hook
2. **Consistent access** - All RLS policies use helper functions
3. **Backward compatibility** - Legacy aliases (team_id, user_role) maintained
4. **Connection pooling safe** - Uses `current_setting()` pattern

### 6.2 Potential Improvements (Non-blocking)

1. **Club switching** - Current implementation uses first active membership. If multi-club users need to switch context, a session variable or cookie-based club selection should update token refresh logic.

2. **Claim expiration handling** - When user roles change mid-session, claims remain stale until token refresh. Consider shorter token lifetimes for high-security environments.

3. **Audit logging** - Consider logging claim values on sensitive operations for forensic analysis.

---

## Appendix: Files Analyzed

| File | Purpose |
|------|---------|
| `supabase/migrations/00006_facility_access_token_hook.sql` | Custom access token hook |
| `supabase/migrations/00005_facility_rls_helpers.sql` | RLS helper functions |
| `supabase/migrations/00008_facility_rls_policies.sql` | RLS policies for tables |

---

*Audit completed: 2026-01-29*
