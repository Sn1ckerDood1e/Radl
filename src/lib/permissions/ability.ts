import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery } from '@casl/prisma';
import type { AppSubjects } from './subjects';
import type { Action } from './actions';

/**
 * Application ability type combining actions and subjects with Prisma query support.
 */
export type AppAbility = PureAbility<[Action, AppSubjects], PrismaQuery>;

/**
 * User context for ability creation.
 * Passed from auth layer to define what user can do.
 */
export interface UserContext {
  userId: string;
  clubId: string;
  roles: ('FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT')[];
  linkedAthleteIds?: string[];  // For PARENT role - IDs of athletes they can see
}

/**
 * Defines abilities for a user based on their roles in current club.
 *
 * IMPORTANT: No role inheritance - each role grants specific permissions only.
 * A FACILITY_ADMIN cannot create lineups unless they ALSO have COACH role.
 * Users can hold multiple roles explicitly for expanded capabilities.
 *
 * @param user - User context with roles and club
 * @returns CASL ability instance for permission checking
 */
export function defineAbilityFor(user: UserContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

  // FACILITY_ADMIN - manages all clubs in facility, no lineup creation
  if (user.roles.includes('FACILITY_ADMIN')) {
    // Admin powers for all clubs (facility-wide)
    can('manage', 'Team');
    can('assign-role', 'Team');
    can('view-audit-log', 'AuditLog');  // All audit logs in facility
    can('export-data', 'Team');
    can('manage-api-keys', 'ApiKey');
    can('invite-member', 'Team');
    can('remove-member', 'Team');
    can('read', 'Practice');
    can('read', 'Lineup');
    can('read', 'Equipment');
    can('read', 'AthleteProfile');
    can('read', 'Season');
    can('read', 'Regatta');
    can('read', 'Entry');
    // NOTE: Cannot create/update lineups, practices - must also have COACH role
  }

  // CLUB_ADMIN - manages their specific club
  if (user.roles.includes('CLUB_ADMIN')) {
    can('manage', 'Team', { id: user.clubId });
    can('assign-role', 'ClubMembership', { clubId: user.clubId });
    can('view-audit-log', 'AuditLog');  // Filtered server-side to their club
    can('export-data', 'Team', { id: user.clubId });
    can('manage-api-keys', 'ApiKey');  // Filtered server-side to their club
    can('invite-member', 'ClubMembership', { clubId: user.clubId });
    can('remove-member', 'ClubMembership', { clubId: user.clubId });
    can('read', 'Practice', { teamId: user.clubId });
    can('read', 'Lineup');  // Can see lineups in their club
    can('read', 'Equipment', { teamId: user.clubId });
    can('read', 'AthleteProfile');  // View roster
    can('read', 'Season', { teamId: user.clubId });
    can('read', 'Regatta', { teamId: user.clubId });
    can('read', 'Entry');
    // NOTE: Cannot create/edit lineups, practices - must also have COACH role
  }

  // COACH - creates lineups, manages practices
  if (user.roles.includes('COACH')) {
    can('manage', 'Practice', { teamId: user.clubId });
    can('publish-practice', 'Practice', { teamId: user.clubId });
    can('manage', 'Lineup');  // Full lineup control
    can('manage', 'Equipment', { teamId: user.clubId });
    can('read', 'AthleteProfile');  // View all athletes for lineup
    can('manage', 'Season', { teamId: user.clubId });
    can('manage', 'Regatta', { teamId: user.clubId });
    can('manage', 'Entry');
    // Own audit log entries only
    can('view-audit-log', 'AuditLog');  // Filtered server-side to own actions
  }

  // ATHLETE - views their own data and team schedule
  if (user.roles.includes('ATHLETE')) {
    can('read', 'Practice', { teamId: user.clubId });  // All practices (published only enforced at query)
    can('read', 'Lineup');  // See lineups they're in
    can('read', 'Equipment', { teamId: user.clubId });  // Boat info
    can('read', 'Season', { teamId: user.clubId });
    can('read', 'Regatta', { teamId: user.clubId });
    can('read', 'Entry');  // Race entries
    can('update', 'AthleteProfile', { teamMemberId: user.userId });  // Own profile only
  }

  // PARENT - sees linked athlete(s) data + team schedule
  if (user.roles.includes('PARENT') && user.linkedAthleteIds?.length) {
    can('read', 'Practice', { teamId: user.clubId });  // Team schedule
    can('read', 'AthleteProfile', { id: { in: user.linkedAthleteIds } });  // Linked athletes only
    can('read', 'Lineup');  // Filtered server-side to show only linked athletes
    can('read', 'Regatta', { teamId: user.clubId });
    can('read', 'Entry');
  }

  return build();
}

/**
 * Creates an empty ability (no permissions).
 * Used when user has no valid context.
 */
export function createEmptyAbility(): AppAbility {
  const { build } = new AbilityBuilder<AppAbility>(createPrismaAbility);
  return build();
}
