import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar } from 'lucide-react';

interface PracticesPageProps {
  params: Promise<{ teamSlug: string }>;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function PracticesPage({ params }: PracticesPageProps) {
  const { teamSlug } = await params;

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
    orderBy: { startDate: 'desc' },
  });

  // Get practices for all active seasons
  // Coaches see all, athletes see only PUBLISHED
  const where: {
    teamId: string;
    seasonId?: { in: string[] };
    status?: 'PUBLISHED';
  } = {
    teamId: team.id,
  };

  if (seasons.length > 0) {
    where.seasonId = { in: seasons.map(s => s.id) };
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

  return (
    <div className="max-w-4xl mx-auto">
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
            Create a season first before adding practices.
          </p>
        </div>
      )}

      {/* Practices list */}
      {practices.length > 0 ? (
        <div className="space-y-3">
          {practices.map((practice) => (
            <Link
              key={practice.id}
              href={`/${teamSlug}/practices/${practice.id}`}
              className="block p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-white">{practice.name}</h3>
                    {practice.status === 'DRAFT' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
                        Draft
                      </span>
                    )}
                    {practice.status === 'PUBLISHED' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        Published
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">
                    {formatDate(practice.date)} &middot; {formatTime(practice.startTime)} - {formatTime(practice.endTime)}
                  </p>
                  {practice.season && (
                    <p className="text-xs text-zinc-500 mt-1">{practice.season.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {practice.blocks.map((block, idx) => (
                    <span
                      key={block.id}
                      className={`
                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${block.type === 'WATER' ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${block.type === 'LAND' ? 'bg-green-500/20 text-green-400' : ''}
                        ${block.type === 'ERG' ? 'bg-orange-500/20 text-orange-400' : ''}
                      `}
                    >
                      {block.type}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Calendar}
            title="No practices yet"
            description={isCoach ? "Create your first practice to get started." : "No practices have been published yet."}
            action={isCoach && seasons.length > 0 ? { label: "New Practice", href: `/${teamSlug}/practices/new` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
