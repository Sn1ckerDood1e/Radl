import type { Subjects } from '@casl/prisma';
import type {
  Team,
  Practice,
  Lineup,
  Equipment,
  AthleteProfile,
  Season,
  ClubMembership,
  Regatta,
  Entry,
} from '@/generated/prisma';

/**
 * Subject types for CASL ability definitions.
 * Maps Prisma models to CASL subjects with field typing.
 *
 * Note: AuditLog and ApiKey models will be added in future plans.
 * Until then, they are represented as string subjects for forward compatibility.
 */
export type AppSubjects =
  | Subjects<{
      Team: Team;
      Practice: Practice;
      Lineup: Lineup;
      Equipment: Equipment;
      AthleteProfile: AthleteProfile;
      Season: Season;
      ClubMembership: ClubMembership;
      Regatta: Regatta;
      Entry: Entry;
    }>
  | 'AuditLog'  // Placeholder until model exists
  | 'ApiKey';   // Placeholder until model exists

export const SUBJECTS = [
  'Team',
  'Practice',
  'Lineup',
  'Equipment',
  'AthleteProfile',
  'Season',
  'ClubMembership',
  'AuditLog',
  'ApiKey',
  'Regatta',
  'Entry',
] as const;

export type SubjectName = typeof SUBJECTS[number];
