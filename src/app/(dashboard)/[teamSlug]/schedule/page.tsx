import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { UnifiedCalendar } from '@/components/calendar/unified-calendar';

interface SchedulePageProps {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}

export default async function SchedulePage({ params, searchParams }: SchedulePageProps) {
  const { teamSlug } = await params;
  const { seasonId } = await searchParams;

  // Verify user has a team
  const { claims } = await requireTeam();

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
    },
  });

  if (!team || team.slug !== teamSlug) {
    redirect('/create-team');
  }

  const isCoach = claims.user_role === 'COACH';

  // Get active seasons for this team
  const seasons = await prisma.season.findMany({
    where: {
      teamId: team.id,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { startDate: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/${teamSlug}`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-white">Schedule</h1>
          </div>
          <p className="text-zinc-400">
            {isCoach ? 'View and manage team schedule' : 'View upcoming practices and regattas'}
          </p>
        </div>
        {isCoach && seasons.length > 0 && (
          <Link
            href={`/${teamSlug}/practices/new`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Practice
          </Link>
        )}
      </div>

      {/* Season reminder if no active seasons */}
      {isCoach && seasons.length === 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-sm">
            Create a season first to start adding practices and viewing the schedule.
          </p>
        </div>
      )}

      {/* Calendar */}
      <UnifiedCalendar
        teamSlug={teamSlug}
        isCoach={isCoach}
        seasons={seasons}
        initialSeasonId={seasonId}
      />
    </div>
  );
}
