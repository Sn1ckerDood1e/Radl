import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { InvitationsClient } from './invitations-client';

interface InvitationsPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function InvitationsPage({ params }: InvitationsPageProps) {
  const { teamSlug } = await params;

  // Verify user is a coach
  const { claims } = await requireRole(['COACH']);

  if (!claims.team_id) {
    redirect('/create-team');
  }

  // Get team info
  const team = await prisma.team.findUnique({
    where: { id: claims.team_id },
    select: {
      id: true,
      name: true,
      slug: true,
      joinCode: true,
    },
  });

  if (!team || team.slug !== teamSlug) {
    redirect('/create-team');
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

      {/* Team Code Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Team Code</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Share this code with athletes and parents to let them request to join.
            </p>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700 select-all cursor-pointer">
            {team.joinCode}
          </div>
        </div>
        <div className="mt-3 text-sm text-zinc-500">
          Join link: <code className="bg-zinc-800 px-2 py-1 rounded text-zinc-300">{process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/join/{team.joinCode}</code>
        </div>
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
