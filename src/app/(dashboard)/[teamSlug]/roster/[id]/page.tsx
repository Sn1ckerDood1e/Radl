import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { AthleteProfileClient } from './profile-client';

interface ProfilePageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function AthleteProfilePage({ params }: ProfilePageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { user, team, isCoach } = await requireTeamBySlug(teamSlug);

  // Get team member by ID with their athlete profile
  const teamMember = await prisma.teamMember.findUnique({
    where: { id },
    include: {
      athleteProfile: true,
    },
  });

  if (!teamMember || teamMember.teamId !== team.id) {
    redirect(`/${teamSlug}/roster`);
  }

  // Determine if current user can edit:
  // - User is the athlete themselves
  // - User is a coach on the team
  const isSelf = teamMember.userId === user.id;
  const canEdit = isCoach || isSelf;

  // Serialize for client
  const memberData = {
    id: teamMember.id,
    userId: teamMember.userId,
    role: teamMember.role,
    createdAt: teamMember.createdAt.toISOString(),
    profile: teamMember.athleteProfile ? {
      id: teamMember.athleteProfile.id,
      displayName: teamMember.athleteProfile.displayName,
      sidePreference: teamMember.athleteProfile.sidePreference,
      canBow: teamMember.athleteProfile.canBow,
      canCox: teamMember.athleteProfile.canCox,
      phone: teamMember.athleteProfile.phone,
      emergencyName: teamMember.athleteProfile.emergencyName,
      emergencyPhone: teamMember.athleteProfile.emergencyPhone,
      photoUrl: teamMember.athleteProfile.photoUrl,
    } : null,
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back link */}
      <Link
        href={`/${teamSlug}/roster`}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Roster
      </Link>

      <AthleteProfileClient
        member={memberData}
        teamSlug={teamSlug}
        canEdit={canEdit}
        isSelf={isSelf}
      />
    </div>
  );
}
