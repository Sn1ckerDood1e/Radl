import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { InvitationsClient } from './invitations-client';
import { ShareJoinLink } from '@/components/teams/share-join-link';

interface InvitationsPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function InvitationsPage({ params }: InvitationsPageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can manage invitations
  if (!isCoach) {
    redirect(`/${teamSlug}`);
  }

  // Get pending invitations and join requests
  const invitations = await prisma.invitation.findMany({
    where: {
      teamId: team.id,
    },
    orderBy: [
      { status: 'asc' }, // PENDING first
      { createdAt: 'desc' },
    ],
  });

  // Get team athletes for parent linking (useful for context)
  const athletes = await prisma.teamMember.findMany({
    where: {
      teamId: team.id,
      role: 'ATHLETE',
    },
    select: {
      userId: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/${teamSlug}/roster`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Invitations</h1>
          <p className="text-zinc-400 mt-1">
            Invite new members to {team.name} or approve pending join requests.
          </p>
        </div>
      </div>

      {/* Share Join Link Section */}
      <div className="mb-8">
        <ShareJoinLink joinCode={team.joinCode} />
      </div>

      <InvitationsClient
        teamSlug={teamSlug}
        invitations={invitations.map(inv => ({
          id: inv.id,
          email: inv.email,
          userId: inv.userId,
          role: inv.role,
          status: inv.status,
          createdAt: inv.createdAt.toISOString(),
          acceptedAt: inv.acceptedAt?.toISOString() || null,
        }))}
        athleteCount={athletes.length}
      />
    </div>
  );
}
