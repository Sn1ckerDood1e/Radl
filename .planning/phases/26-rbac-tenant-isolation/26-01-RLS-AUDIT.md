# RLS Audit Report

**Generated:** 2026-01-29
**Database:** Radl Production
**Schema:** public

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tables | 43 |
| RLS Enabled | 5 (12%) |
| RLS Disabled | 38 (88%) |
| Tables with Policies | 6 |
| Total Policies | 23 |
| Critical Gaps | 1 (Equipment has policies but RLS disabled) |

**Key Finding:** Only 5 of 43 tables have RLS enabled at the database level. The remaining 38 tables rely entirely on application-level access control via Prisma. This creates risk if:
- Direct database access is granted (e.g., Supabase Dashboard)
- Service role key is compromised
- Application bypass vulnerabilities exist

## Complete Table Audit

| Table | RLS Enabled | Policy Count | Policies | Status |
|-------|-------------|--------------|----------|--------|
| Announcement | NO | 0 | - | **RLS DISABLED** |
| AnnouncementRead | NO | 0 | - | **RLS DISABLED** |
| ApiKey | NO | 0 | - | **RLS DISABLED** |
| AthleteEligibility | NO | 0 | - | **RLS DISABLED** |
| AthleteProfile | NO | 0 | - | **RLS DISABLED** |
| AuditLog | NO | 0 | - | **RLS DISABLED** |
| BlockTemplate | NO | 0 | - | **RLS DISABLED** |
| ClubMembership | NO | 0 | - | **RLS DISABLED** |
| DamageReport | NO | 0 | - | **RLS DISABLED** |
| Entry | NO | 0 | - | **RLS DISABLED** |
| EntryLineup | NO | 0 | - | **RLS DISABLED** |
| EntrySeat | NO | 0 | - | **RLS DISABLED** |
| Equipment | NO | 4 | SELECT/INSERT/UPDATE/DELETE | **CRITICAL: Policies exist but RLS disabled** |
| EquipmentBooking | NO | 0 | - | **RLS DISABLED** |
| EquipmentUsageLog | NO | 0 | - | **RLS DISABLED** |
| Facility | YES | 4 | SELECT/INSERT/UPDATE/DELETE | OK |
| FacilityMembership | YES | 5 | SELECT(x2)/INSERT/UPDATE/DELETE | OK |
| Invitation | YES | 4 | SELECT(x2)/INSERT/UPDATE | OK |
| LandAssignment | NO | 0 | - | **RLS DISABLED** |
| Lineup | NO | 0 | - | **RLS DISABLED** |
| LineupTemplate | NO | 0 | - | **RLS DISABLED** |
| MfaBackupCode | NO | 0 | - | **RLS DISABLED** |
| Notification | NO | 0 | - | **RLS DISABLED** |
| NotificationConfig | NO | 0 | - | **RLS DISABLED** |
| PermissionGrant | NO | 0 | - | **RLS DISABLED** |
| Practice | NO | 0 | - | **RLS DISABLED** |
| PracticeBlock | NO | 0 | - | **RLS DISABLED** |
| PracticeTemplate | NO | 0 | - | **RLS DISABLED** |
| PushSubscription | NO | 0 | - | **RLS DISABLED** |
| Regatta | NO | 0 | - | **RLS DISABLED** |
| RegattaCentralConnection | NO | 0 | - | **RLS DISABLED** |
| Season | NO | 0 | - | **RLS DISABLED** |
| SeatAssignment | NO | 0 | - | **RLS DISABLED** |
| SsoConfig | NO | 0 | - | **RLS DISABLED** |
| Team | YES | 2 | SELECT/UPDATE | OK |
| TeamMember | YES | 4 | SELECT/INSERT/UPDATE/DELETE | OK |
| TeamSettings | NO | 0 | - | **RLS DISABLED** |
| TemplateBlock | NO | 0 | - | **RLS DISABLED** |
| TemplateSeat | NO | 0 | - | **RLS DISABLED** |
| Workout | NO | 0 | - | **RLS DISABLED** |
| WorkoutInterval | NO | 0 | - | **RLS DISABLED** |
| WorkoutTemplate | NO | 0 | - | **RLS DISABLED** |
| WorkoutTemplateInterval | NO | 0 | - | **RLS DISABLED** |

## Critical Gaps

### 1. Equipment Table - Policies Exist But RLS Disabled

**Severity:** CRITICAL
**Impact:** Equipment table has well-designed hierarchical policies but they have NO EFFECT because `ALTER TABLE Equipment ENABLE ROW LEVEL SECURITY` was never run.

**Existing Policies (inactive):**
- `equipment_select_hierarchical` - Filters by owner type (TEAM/CLUB/FACILITY)
- `equipment_insert_hierarchical` - Restricts inserts by role hierarchy
- `equipment_update_hierarchical` - Restricts updates by role hierarchy
- `equipment_delete_hierarchical` - Restricts deletes by role hierarchy

**Fix Required:** `ALTER TABLE "Equipment" ENABLE ROW LEVEL SECURITY;`

### 2. Tables Missing RLS Entirely

These tables contain tenant-scoped data but have no database-level isolation:

**High Priority (sensitive data):**
| Table | Tenant Column | Contains |
|-------|---------------|----------|
| AuditLog | clubId | Security-sensitive audit trail |
| ApiKey | clubId | API key hashes and metadata |
| MfaBackupCode | userId | MFA recovery codes |
| PushSubscription | teamId | Push notification endpoints |
| RegattaCentralConnection | teamId | Encrypted OAuth tokens |
| ClubMembership | clubId | User roles and permissions |
| PermissionGrant | clubId | Elevated permission grants |
| SsoConfig | facilityId | SSO provider configuration |

**Medium Priority (operational data):**
| Table | Tenant Column | Contains |
|-------|---------------|----------|
| Practice | teamId | Practice schedules |
| DamageReport | teamId | Equipment damage reports |
| Announcement | teamId | Team announcements |
| Season | teamId | Season configurations |
| Regatta | teamId | Regatta entries |
| Notification | teamId | User notifications |

**Lower Priority (child records via JOINs):**
| Table | Parent Reference | Note |
|-------|------------------|------|
| PracticeBlock | practiceId | Protected if Practice is protected |
| Lineup | blockId | Protected if PracticeBlock is protected |
| SeatAssignment | lineupId | Protected if Lineup is protected |
| Entry | regattaId | Protected if Regatta is protected |
| EntryLineup | entryId | Protected if Entry is protected |
| EntrySeat | entryLineupId | Protected if EntryLineup is protected |
| WorkoutInterval | workoutId | Protected if Workout is protected |
| TemplateBlock | templateId | Protected if PracticeTemplate is protected |
| TemplateSeat | templateId | Protected if LineupTemplate is protected |
| WorkoutTemplateInterval | templateId | Protected if WorkoutTemplate is protected |

## Requirement Status

### ISOL-01: All tables with tenant data have RLS enabled

**Status:** NOT MET

**Tables Meeting Requirement (5):**
- Facility (facility-scoped)
- FacilityMembership (facility-scoped)
- Team (team-scoped)
- TeamMember (team-scoped)
- Invitation (team-scoped)

**Tables NOT Meeting Requirement (38):**
All other tables in the schema

### ISOL-02: RLS filters by tenant appropriately

**Status:** PARTIALLY MET

**Tables with Proper Tenant Filtering:**

| Table | Filtering Method |
|-------|------------------|
| Facility | `id = get_current_facility_id()` via JWT claim |
| FacilityMembership | `facilityId = get_current_facility_id()` or `userId = auth.uid()` |
| Team | `id = get_user_team_id()` via TeamMember lookup |
| TeamMember | `teamId = get_user_team_id()` via TeamMember lookup |
| Invitation | `teamId = get_user_team_id()` or `email = auth.email()` |

**Equipment (policies exist but RLS disabled):**
- SELECT: Hierarchical filter by TEAM/CLUB/FACILITY ownership with JWT claims
- INSERT/UPDATE/DELETE: Same + role-based checks (COACH/CLUB_ADMIN/FACILITY_ADMIN)

## RLS Helper Functions

| Function | Returns | Source | Notes |
|----------|---------|--------|-------|
| `get_user_team_id()` | uuid | TeamMember lookup | Returns NULL if user not in any team |
| `get_user_role()` | text | TeamMember lookup | Returns first role found (single-team assumption) |
| `get_current_club_id()` | text | JWT claim `club_id` | Requires application to set claim |
| `get_current_facility_id()` | text | JWT claim `facility_id` | Requires application to set claim |
| `is_coach_or_higher()` | boolean | Role check | COACH, CLUB_ADMIN, or FACILITY_ADMIN |
| `is_club_admin_or_higher()` | boolean | Role check | CLUB_ADMIN or FACILITY_ADMIN |
| `is_facility_admin()` | boolean | Role check | FACILITY_ADMIN only |

**Concern:** `get_user_role()` and `get_user_team_id()` use direct table lookups rather than JWT claims. This works but requires:
1. TeamMember table to be queryable (has RLS enabled, OK)
2. No support for multi-club users (returns first match only)

## Policy Details

### Facility Policies

```sql
-- SELECT: User can view their facility
USING (id = get_current_facility_id())

-- INSERT: Facility admins only
WITH CHECK (is_facility_admin())

-- UPDATE/DELETE: Facility admins on their facility only
USING ((id = get_current_facility_id()) AND is_facility_admin())
```

### FacilityMembership Policies

```sql
-- SELECT own: Users can see their own memberships
USING ("userId" = auth.uid()::text)

-- SELECT all in facility: Facility admins can see all
USING (("facilityId" = get_current_facility_id()) AND is_facility_admin())

-- INSERT/UPDATE/DELETE: Facility admins on their facility
USING/WITH CHECK (("facilityId" = get_current_facility_id()) AND is_facility_admin())
```

### Team Policies

```sql
-- SELECT: Users can view their team
USING ((id)::uuid = get_user_team_id())

-- UPDATE: Coaches can update their team
USING/WITH CHECK (((id)::uuid = get_user_team_id()) AND (get_user_role() = 'COACH'))
```

### TeamMember Policies

```sql
-- SELECT: Users can view team members in their team
USING (("teamId")::uuid = get_user_team_id())

-- INSERT/UPDATE/DELETE: Coaches only
USING/WITH CHECK ((("teamId")::uuid = get_user_team_id()) AND (get_user_role() = 'COACH'))
```

### Invitation Policies

```sql
-- SELECT by email: Anyone can view invitations to their email
USING (email = auth.email())

-- SELECT by team: Users can view their team's invitations
USING (("teamId")::uuid = get_user_team_id())

-- INSERT/UPDATE: Coaches only
USING/WITH CHECK ((("teamId")::uuid = get_user_team_id()) AND (get_user_role() = 'COACH'))
```

### Equipment Policies (INACTIVE - RLS disabled)

```sql
-- SELECT: Hierarchical by ownership type
USING (
  (("ownerType" = 'TEAM') AND ("teamId" = get_current_club_id())) OR
  (("ownerType" = 'CLUB') AND ("clubId" = get_current_club_id()) AND ("isShared" = false)) OR
  (("ownerType" = 'CLUB') AND ("isShared" = true) AND ("facilityId" = get_current_facility_id())) OR
  (("ownerType" = 'FACILITY') AND ("facilityId" = get_current_facility_id()))
)

-- INSERT/UPDATE/DELETE: Same + role checks
WITH CHECK (
  (("ownerType" = 'TEAM') AND ("teamId" = get_current_club_id()) AND is_coach_or_higher()) OR
  (("ownerType" = 'CLUB') AND ("clubId" = get_current_club_id()) AND is_club_admin_or_higher()) OR
  (("ownerType" = 'FACILITY') AND ("facilityId" = get_current_facility_id()) AND is_facility_admin())
)
```

## Recommendations

### Immediate Actions (Critical)

1. **Enable RLS on Equipment table**
   ```sql
   ALTER TABLE "Equipment" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Equipment" FORCE ROW LEVEL SECURITY;
   ```
   Existing policies will then take effect.

### High Priority (Sensitive Data)

2. **Add RLS to security-sensitive tables:**
   - AuditLog (filter by clubId)
   - ApiKey (filter by clubId)
   - MfaBackupCode (filter by userId = auth.uid())
   - PushSubscription (filter by userId or teamId)
   - ClubMembership (filter by userId or clubId)
   - PermissionGrant (filter by userId or clubId)

3. **Add RLS to OAuth/token tables:**
   - RegattaCentralConnection (filter by teamId)
   - SsoConfig (filter by facilityId)

### Medium Priority (Operational Data)

4. **Add RLS to team-scoped operational tables:**
   - Practice, DamageReport, Announcement, Season, Regatta
   - TeamSettings, Notification
   - AthleteProfile (via TeamMember join)

### Lower Priority (Transitive Protection)

5. **Child records can be protected transitively** if parent tables have RLS:
   - PracticeBlock, Lineup, SeatAssignment (protected via Practice)
   - Entry, EntryLineup, EntrySeat (protected via Regatta)
   - Workout, WorkoutInterval (protected via Practice)
   - Templates (protected via Team)

   However, direct RLS on these tables provides defense-in-depth.

### Service Role Considerations

Tables that may legitimately need service_role bypass:
- AuditLog (system writes audit entries)
- Notification (system creates notifications)
- PushSubscription (system sends notifications)

These should have RLS enabled with appropriate policies but be accessed via service_role when needed for system operations.

## Appendix: Application-Level Protection

Current protection relies on:
1. **Supabase Auth** - JWT verification on all API routes
2. **CASL Permissions** - `@casl/ability` enforces RBAC in application code
3. **Prisma Queries** - All queries filter by user's teamId/clubId

This is acceptable defense-in-depth but does NOT protect against:
- Direct database access via Supabase Dashboard
- Compromised service role key
- Application-level authorization bugs
- SQL injection bypassing Prisma

Database-level RLS provides the last line of defense.
