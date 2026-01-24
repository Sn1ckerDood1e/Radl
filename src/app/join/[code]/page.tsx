import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { JoinTeamClient } from './join-team-client';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;

  // Verify the team code is valid
  const team = await prisma.team.findUnique({
    where: { joinCode: code.toUpperCase() },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Team Code</h1>
          <p className="text-gray-600 mb-6">
            The team code you entered is not valid. Please check the code and try again.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not authenticated, redirect to signup with return URL
  if (!user) {
    const returnUrl = encodeURIComponent(`/join/${code}`);
    redirect(`/signup?redirect=${returnUrl}`);
  }

  // Check if user is already a member
  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    // Already a member, redirect to team dashboard
    redirect(`/${team.slug}`);
  }

  // Check for existing pending request
  const pendingRequest = await prisma.invitation.findFirst({
    where: {
      teamId: team.id,
      email: user.email?.toLowerCase() || undefined,
      status: 'PENDING',
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md overflow-hidden">
        {/* Team Header */}
        <div className="p-6 text-white bg-emerald-600">
          <div className="flex items-center gap-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={`${team.name} logo`}
                className="w-16 h-16 rounded-full object-cover bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {team.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-white/80">Join this team</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {pendingRequest ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Request Pending</h2>
              <p className="text-gray-600">
                Your request to join {team.name} is waiting for coach approval.
              </p>
            </div>
          ) : (
            <JoinTeamClient teamCode={code} teamName={team.name} />
          )}
        </div>
      </div>
    </div>
  );
}
