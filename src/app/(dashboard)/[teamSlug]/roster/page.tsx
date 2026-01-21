import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { RosterClient } from './roster-client';

interface RosterPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function RosterPage({ params }: RosterPageProps) {
  const { teamSlug } = await params;

  // Any team member can view roster
  const { claims } = await requireRole(['COACH', 'ATHLETE', 'PARENT']);

  if (!claims.team_id) {
    redirect('/create-team');
  }

  // Get team info including joinCode
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

  const isCoach = claims.user_role === 'COACH';

  // Get all team members and pending invitations in parallel
  const [teamMembers, pendingInvitations] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: team.id },
      include: { athleteProfile: true },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    }),
    isCoach
      ? prisma.invitation.findMany({
          where: { teamId: team.id, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        })
      : [],
  ]);

  // Serialize dates and format for client
  const members = teamMembers.map(member => ({
    id: member.id,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    profile: member.athleteProfile ? {
      id: member.athleteProfile.id,
      displayName: member.athleteProfile.displayName,
      sidePreference: member.athleteProfile.sidePreference,
      canBow: member.athleteProfile.canBow,
      canCox: member.athleteProfile.canCox,
      phone: member.athleteProfile.phone,
      photoUrl: member.athleteProfile.photoUrl,
    } : null,
  }));

  const invitations = pendingInvitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/${teamSlug}`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
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
            </Link>
            <h1 className="text-2xl font-bold text-white">Roster</h1>
          </div>
          <p className="text-zinc-400">
            {members.length} team member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Team Code Section (Coach Only) */}
      {isCoach && (
        <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white mb-1">Invite Link</h3>
              <p className="text-sm text-zinc-400">
                Share this code with athletes and parents to let them request to join
              </p>
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700 select-all cursor-pointer" title="Click to select">
              {team.joinCode}
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations Section (Coach Only) */}
      {isCoach && invitations.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              Pending Requests
              <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                {invitations.length}
              </span>
            </h3>
            <Link
              href={`/${teamSlug}/invitations`}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage all
            </Link>
          </div>
          <div className="space-y-2">
            {invitations.slice(0, 3).map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-zinc-300">
                      {(inv.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{inv.email || 'Unknown'}</p>
                    <p className="text-xs text-zinc-500">
                      {inv.role} · Requested {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${teamSlug}/invitations`}
                  className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
            {invitations.length > 3 && (
              <Link
                href={`/${teamSlug}/invitations`}
                className="block text-center py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                +{invitations.length - 3} more pending
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Invite Button for Empty State or Quick Action */}
      {isCoach && members.length <= 1 && (
        <Link
          href={`/${teamSlug}/invitations`}
          className="block mb-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4 hover:border-emerald-500/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="h-6 w-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-200">
                Invite your team
              </h3>
              <p className="text-sm text-emerald-300/70">
                Send email invitations or share your team code
              </p>
            </div>
            <svg
              className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Team Members */}
      {members.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No team members yet
          </h3>
          <p className="text-zinc-500 mb-6">
            Invite your first athlete or coach to get started.
          </p>
        </div>
      ) : (
        <RosterClient members={members} teamSlug={teamSlug} isCoach={isCoach} />
      )}
    </div>
  );
}
