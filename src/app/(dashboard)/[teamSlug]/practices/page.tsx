import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EmptyState } from '@/components/ui/empty-state';
import { PracticeListClient } from '@/components/practices/practice-list-client';
import { Calendar, Plus, Copy } from 'lucide-react';

interface PracticesPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function PracticesPage({ params }: PracticesPageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

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
          <div className="flex items-center gap-2">
            <Link
              href={`/${teamSlug}/practices/bulk-create`}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              <Copy className="h-4 w-4 mr-2" />
              Create Multiple
            </Link>
            <Link
              href={`/${teamSlug}/practices/new`}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Practice
            </Link>
          </div>
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
            action={isCoach && seasons.length > 0 ? { label: "New Practice", href: `/${teamSlug}/practices/new` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
