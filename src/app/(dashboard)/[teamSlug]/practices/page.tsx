import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EmptyState } from '@/components/ui/empty-state';
import { PracticeListClient } from '@/components/practices/practice-list-client';
import { UnifiedCalendar } from '@/components/calendar/unified-calendar';
import { SeasonManager } from '@/components/seasons/season-manager';
import { Calendar, Plus, Copy, CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PracticesPageProps {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ view?: string; seasonId?: string }>;
}

export default async function PracticesPage({ params, searchParams }: PracticesPageProps) {
  const { teamSlug } = await params;
  const { view = 'list', seasonId } = await searchParams;
  const viewMode = view === 'calendar' ? 'calendar' : 'list';

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Get all seasons for this team (for SeasonManager)
  const allSeasons = await prisma.season.findMany({
    where: {
      teamId: team.id,
    },
    orderBy: [
      { status: 'asc' }, // ACTIVE before ARCHIVED
      { startDate: 'desc' },
    ],
  });

  // Filter to active seasons for practice filtering
  const activeSeasons = allSeasons.filter(s => s.status === 'ACTIVE');

  // Get practices for all active seasons
  // Coaches see all, athletes see only PUBLISHED
  const where: {
    teamId: string;
    seasonId?: { in: string[] };
    status?: 'PUBLISHED';
  } = {
    teamId: team.id,
  };

  if (activeSeasons.length > 0) {
    where.seasonId = { in: activeSeasons.map(s => s.id) };
  }

  if (!isCoach) {
    where.status = 'PUBLISHED';
  }

  const practices = await prisma.practice.findMany({
    where,
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
      season: {
        select: { name: true },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  });

  // Prepare seasons data for UnifiedCalendar (only needs id and name from active seasons)
  const seasonsForCalendar = activeSeasons.map(s => ({ id: s.id, name: s.name }));

  // Prepare seasons data for SeasonManager (needs full details)
  const seasonsForManager = allSeasons.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
  }));

  return (
    <div className={cn(viewMode === 'calendar' ? 'max-w-6xl' : 'max-w-4xl', 'mx-auto')}>
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
            <h1 className="text-2xl font-bold text-white">Practices</h1>
          </div>
          <p className="text-zinc-400">
            {isCoach ? 'Manage practice schedules' : 'View upcoming practices'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Season manager (coaches only) */}
          {isCoach && (
            <SeasonManager teamSlug={teamSlug} seasons={seasonsForManager} />
          )}

          {/* View toggle (pill buttons) */}
          <div className="flex items-center p-1 bg-zinc-800 rounded-lg border border-zinc-700">
            <Link
              href={`/${teamSlug}/practices?view=list`}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Link>
            <Link
              href={`/${teamSlug}/practices?view=calendar`}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'calendar'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="sr-only">Calendar view</span>
            </Link>
          </div>

          {/* Coach actions */}
          {isCoach && activeSeasons.length > 0 && (
            <>
              <Link
                href={`/${teamSlug}/practices/bulk-create?view=${viewMode}`}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              >
                <Copy className="h-4 w-4 mr-2" />
                Create Multiple
              </Link>
              <Link
                href={`/${teamSlug}/practices/new?view=${viewMode}`}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Practice
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Season reminder if no active seasons */}
      {isCoach && activeSeasons.length === 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-sm">
            Create a season first before adding practices.
          </p>
        </div>
      )}

      {/* View content based on viewMode */}
      {viewMode === 'calendar' ? (
        <UnifiedCalendar
          teamSlug={teamSlug}
          teamId={team.id}
          isCoach={isCoach}
          seasons={seasonsForCalendar}
          initialSeasonId={seasonId}
        />
      ) : (
        /* List view */
        practices.length > 0 ? (
          <PracticeListClient
            practices={practices}
            teamSlug={teamSlug}
            isCoach={isCoach}
          />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
            <EmptyState
              icon={Calendar}
              title="No practices yet"
              description={isCoach ? "Create your first practice to get started." : "No practices have been published yet."}
              action={isCoach && activeSeasons.length > 0 ? { label: "Create Practice", href: `/${teamSlug}/practices/new` } : undefined}
            />
          </div>
        )
      )}
    </div>
  );
}
