/**
 * CASL Ability Unit Tests
 *
 * Tests for RBAC-01 through RBAC-04:
 * - FACILITY_ADMIN: Facility-level operations, no lineup creation without COACH
 * - CLUB_ADMIN: Club management, no cross-club access
 * - COACH: Practice/equipment/lineup management
 * - ATHLETE: Read-only schedule access
 * - PARENT: View linked athletes' data
 */

import { describe, it, expect } from 'vitest';
import { subject } from '@casl/ability';
import { defineAbilityFor, createEmptyAbility, type UserContext } from '@/lib/permissions/ability';

/**
 * Helper to create typed subject instances for CASL testing.
 * CASL requires subject() wrapper when testing conditional rules.
 */
const Team = (attrs: Record<string, unknown>) => subject('Team', attrs);
const Practice = (attrs: Record<string, unknown>) => subject('Practice', attrs);
const Lineup = (attrs: Record<string, unknown>) => subject('Lineup', attrs);
const Equipment = (attrs: Record<string, unknown>) => subject('Equipment', attrs);
const AthleteProfile = (attrs: Record<string, unknown>) => subject('AthleteProfile', attrs);
const Season = (attrs: Record<string, unknown>) => subject('Season', attrs);
const ClubMembership = (attrs: Record<string, unknown>) => subject('ClubMembership', attrs);
const Regatta = (attrs: Record<string, unknown>) => subject('Regatta', attrs);
const Entry = (attrs: Record<string, unknown>) => subject('Entry', attrs);
const Facility = (attrs: Record<string, unknown>) => subject('Facility', attrs);
const Announcement = (attrs: Record<string, unknown>) => subject('Announcement', attrs);

// =============================================================================
// RBAC-01: FACILITY_ADMIN Permissions
// =============================================================================

describe('RBAC-01: FACILITY_ADMIN permissions', () => {
  describe('facility view mode', () => {
    it('can read practices in facility view mode', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('read', 'Practice')).toBe(true);
    });

    it('can read all teams in facility', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('read', 'Team')).toBe(true);
    });

    it('can manage own facility', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('manage', Facility({ id: 'facility-1' }))).toBe(true);
    });

    it('cannot manage other facilities', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('manage', Facility({ id: 'facility-2' }))).toBe(false);
    });

    it('can assign roles in facility view', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('assign-role', 'Team')).toBe(true);
    });

    it('can view audit logs', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('view-audit-log', 'AuditLog')).toBe(true);
    });
  });

  describe('cannot create without COACH role', () => {
    it('cannot create practices without COACH role', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('create', 'Practice')).toBe(false);
      expect(ability.can('manage', 'Practice')).toBe(false);
    });

    it('cannot create lineups without COACH role', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('create', 'Lineup')).toBe(false);
      expect(ability.can('manage', 'Lineup')).toBe(false);
    });

    it('cannot manage equipment without COACH role', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'facility',
      });
      expect(ability.can('manage', 'Equipment')).toBe(false);
    });
  });

  describe('with COACH role (dual role)', () => {
    it('CAN manage practices when also has COACH role', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN', 'COACH'],
        viewMode: 'club',
      });
      expect(ability.can('manage', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('CAN manage lineups when also has COACH role', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN', 'COACH'],
        viewMode: 'club',
      });
      expect(ability.can('manage', 'Lineup')).toBe(true);
    });

    it('CAN manage equipment when also has COACH role', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN', 'COACH'],
        viewMode: 'club',
      });
      expect(ability.can('manage', Equipment({ teamId: 'club-a' }))).toBe(true);
    });
  });

  describe('club drill-down view mode', () => {
    it('has read-only access to specific club', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'club',
      });
      expect(ability.can('read', Team({ id: 'club-a' }))).toBe(true);
      expect(ability.can('read', Practice({ teamId: 'club-a' }))).toBe(true);
      expect(ability.can('manage', 'Team')).toBe(false);
    });

    it('cannot assign roles in club drill-down', () => {
      const ability = defineAbilityFor({
        userId: 'user-1',
        clubId: 'club-a',
        facilityId: 'facility-1',
        roles: ['FACILITY_ADMIN'],
        viewMode: 'club',
      });
      expect(ability.can('assign-role', 'Team')).toBe(false);
    });
  });
});

// =============================================================================
// RBAC-02: CLUB_ADMIN Permissions
// =============================================================================

describe('RBAC-02: CLUB_ADMIN permissions', () => {
  const clubAdminContext: UserContext = {
    userId: 'user-1',
    clubId: 'club-a',
    roles: ['CLUB_ADMIN'],
    viewMode: 'club',
  };

  describe('own club management', () => {
    it('can manage own club settings', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('manage', Team({ id: 'club-a' }))).toBe(true);
    });

    it('can assign roles within own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('assign-role', ClubMembership({ clubId: 'club-a' }))).toBe(true);
    });

    it('can view audit logs', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('view-audit-log', 'AuditLog')).toBe(true);
    });

    it('can export data from own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('export-data', Team({ id: 'club-a' }))).toBe(true);
    });

    it('can manage API keys', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('manage-api-keys', 'ApiKey')).toBe(true);
    });

    it('can invite members to own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('invite-member', ClubMembership({ clubId: 'club-a' }))).toBe(true);
    });

    it('can remove members from own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('remove-member', ClubMembership({ clubId: 'club-a' }))).toBe(true);
    });
  });

  describe('read access to club resources', () => {
    it('can read practices in own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('read', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read lineups', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('read', 'Lineup')).toBe(true);
    });

    it('can read equipment in own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('read', Equipment({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read athlete profiles', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('read', 'AthleteProfile')).toBe(true);
    });

    it('can read announcements in own club', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('read', Announcement({ teamId: 'club-a' }))).toBe(true);
    });
  });

  describe('cross-club restrictions', () => {
    it('cannot access other clubs', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('manage', Team({ id: 'club-b' }))).toBe(false);
    });

    it('cannot assign roles in other clubs', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('assign-role', ClubMembership({ clubId: 'club-b' }))).toBe(false);
    });

    it('cannot invite members to other clubs', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('invite-member', ClubMembership({ clubId: 'club-b' }))).toBe(false);
    });

    it('cannot export data from other clubs', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('export-data', Team({ id: 'club-b' }))).toBe(false);
    });
  });

  describe('no lineup creation without COACH', () => {
    it('cannot create lineups without COACH role', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('create', 'Lineup')).toBe(false);
      expect(ability.can('manage', 'Lineup')).toBe(false);
    });

    it('cannot create practices without COACH role', () => {
      const ability = defineAbilityFor(clubAdminContext);
      expect(ability.can('create', 'Practice')).toBe(false);
      expect(ability.can('manage', 'Practice')).toBe(false);
    });
  });
});

// =============================================================================
// RBAC-03: COACH Permissions
// =============================================================================

describe('RBAC-03: COACH permissions', () => {
  const coachContext: UserContext = {
    userId: 'coach-1',
    clubId: 'club-a',
    roles: ['COACH'],
    viewMode: 'club',
  };

  describe('practice management', () => {
    it('can manage practices for their club', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can create practices', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('create', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can update practices', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('update', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can delete practices', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('delete', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can publish practices', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('publish-practice', Practice({ teamId: 'club-a' }))).toBe(true);
    });
  });

  describe('equipment management', () => {
    it('can manage equipment', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Equipment({ teamId: 'club-a' }))).toBe(true);
    });

    it('can create equipment', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('create', Equipment({ teamId: 'club-a' }))).toBe(true);
    });

    it('can update equipment', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('update', Equipment({ teamId: 'club-a' }))).toBe(true);
    });
  });

  describe('lineup management', () => {
    it('can manage lineups', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', 'Lineup')).toBe(true);
    });

    it('can create lineups', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('create', 'Lineup')).toBe(true);
    });

    it('can update lineups', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('update', 'Lineup')).toBe(true);
    });

    it('can delete lineups', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('delete', 'Lineup')).toBe(true);
    });
  });

  describe('additional coach permissions', () => {
    it('can read athlete profiles for lineup assignment', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('read', 'AthleteProfile')).toBe(true);
    });

    it('can manage seasons', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Season({ teamId: 'club-a' }))).toBe(true);
    });

    it('can manage regattas', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Regatta({ teamId: 'club-a' }))).toBe(true);
    });

    it('can manage entries', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', 'Entry')).toBe(true);
    });

    it('can manage announcements', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Announcement({ teamId: 'club-a' }))).toBe(true);
    });

    it('can view audit logs (own actions)', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('view-audit-log', 'AuditLog')).toBe(true);
    });
  });

  describe('restrictions', () => {
    it('cannot manage other clubs practices', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Practice({ teamId: 'club-b' }))).toBe(false);
    });

    it('cannot manage other clubs equipment', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', Equipment({ teamId: 'club-b' }))).toBe(false);
    });

    it('cannot manage teams', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('manage', 'Team')).toBe(false);
    });

    it('cannot assign roles', () => {
      const ability = defineAbilityFor(coachContext);
      expect(ability.can('assign-role', 'Team')).toBe(false);
      expect(ability.can('assign-role', 'ClubMembership')).toBe(false);
    });
  });
});

// =============================================================================
// RBAC-04: ATHLETE Permissions
// =============================================================================

describe('RBAC-04: ATHLETE permissions', () => {
  const athleteContext: UserContext = {
    userId: 'athlete-1',
    clubId: 'club-a',
    roles: ['ATHLETE'],
    viewMode: 'club',
  };

  describe('read permissions', () => {
    it('can read practices (published only enforced at query level)', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read lineups they are in', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', 'Lineup')).toBe(true);
    });

    it('can read equipment info', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', Equipment({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read seasons', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', Season({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read regattas', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', Regatta({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read entries', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', 'Entry')).toBe(true);
    });

    it('can read announcements', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('read', Announcement({ teamId: 'club-a' }))).toBe(true);
    });
  });

  describe('own profile management', () => {
    it('can update own athlete profile', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('update', AthleteProfile({ teamMemberId: 'athlete-1' }))).toBe(true);
    });

    it('cannot update other athlete profiles', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('update', AthleteProfile({ teamMemberId: 'athlete-2' }))).toBe(false);
    });
  });

  describe('restrictions', () => {
    it('cannot create practices', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('create', 'Practice')).toBe(false);
    });

    it('cannot update practices', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('update', 'Practice')).toBe(false);
    });

    it('cannot delete practices', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('delete', 'Practice')).toBe(false);
    });

    it('cannot create lineups', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('create', 'Lineup')).toBe(false);
    });

    it('cannot update lineups', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('update', 'Lineup')).toBe(false);
    });

    it('cannot create equipment', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('create', 'Equipment')).toBe(false);
    });

    it('cannot update equipment', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('update', 'Equipment')).toBe(false);
    });

    it('cannot manage teams', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('manage', 'Team')).toBe(false);
    });

    it('cannot assign roles', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('assign-role', 'Team')).toBe(false);
    });

    it('cannot view audit logs', () => {
      const ability = defineAbilityFor(athleteContext);
      expect(ability.can('view-audit-log', 'AuditLog')).toBe(false);
    });
  });
});

// =============================================================================
// RBAC-05: PARENT Permissions
// =============================================================================

describe('RBAC-05: PARENT permissions', () => {
  const parentContext: UserContext = {
    userId: 'parent-1',
    clubId: 'club-a',
    roles: ['PARENT'],
    linkedAthleteIds: ['athlete-1', 'athlete-2'],
    viewMode: 'club',
  };

  describe('linked athlete visibility', () => {
    it('can read team schedule', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', Practice({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read linked athletes profiles', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', AthleteProfile({ id: 'athlete-1' }))).toBe(true);
      expect(ability.can('read', AthleteProfile({ id: 'athlete-2' }))).toBe(true);
    });

    it('cannot read unlinked athletes profiles', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', AthleteProfile({ id: 'athlete-3' }))).toBe(false);
    });

    it('can read lineups (filtered server-side to linked athletes)', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', 'Lineup')).toBe(true);
    });

    it('can read regattas', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', Regatta({ teamId: 'club-a' }))).toBe(true);
    });

    it('can read entries', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', 'Entry')).toBe(true);
    });

    it('can read announcements', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('read', Announcement({ teamId: 'club-a' }))).toBe(true);
    });
  });

  describe('restrictions', () => {
    it('cannot create or modify anything', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('create', 'Practice')).toBe(false);
      expect(ability.can('update', 'Practice')).toBe(false);
      expect(ability.can('create', 'Lineup')).toBe(false);
      expect(ability.can('create', 'Equipment')).toBe(false);
    });

    it('cannot manage teams', () => {
      const ability = defineAbilityFor(parentContext);
      expect(ability.can('manage', 'Team')).toBe(false);
    });
  });

  describe('without linked athletes', () => {
    it('has no permissions when no athletes linked', () => {
      const parentWithoutLinks: UserContext = {
        userId: 'parent-2',
        clubId: 'club-a',
        roles: ['PARENT'],
        linkedAthleteIds: [],
        viewMode: 'club',
      };
      const ability = defineAbilityFor(parentWithoutLinks);
      expect(ability.can('read', 'Practice')).toBe(false);
      expect(ability.can('read', 'AthleteProfile')).toBe(false);
    });
  });
});

// =============================================================================
// No Role / Empty Ability
// =============================================================================

describe('No role / empty ability', () => {
  it('empty ability returns false for all actions', () => {
    const ability = createEmptyAbility();
    expect(ability.can('read', 'Practice')).toBe(false);
    expect(ability.can('read', 'Team')).toBe(false);
    expect(ability.can('manage', 'Lineup')).toBe(false);
    expect(ability.can('create', 'Equipment')).toBe(false);
  });

  it('user with empty roles array has no permissions', () => {
    const ability = defineAbilityFor({
      userId: 'user-1',
      clubId: 'club-a',
      roles: [],
      viewMode: 'club',
    });
    expect(ability.can('read', 'Practice')).toBe(false);
    expect(ability.can('manage', 'Team')).toBe(false);
  });
});
