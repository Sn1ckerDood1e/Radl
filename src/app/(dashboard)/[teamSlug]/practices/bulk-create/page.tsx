import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { BulkPracticeCreator } from '@/components/practices/bulk-practice-creator';

interface PageProps {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ date?: string; seasonId?: string }>;
}

export default async function BulkCreatePracticesPage({ params, searchParams }: PageProps) {
  const { teamSlug } = await params;
  const { date: dateParam, seasonId: seasonIdParam } = await searchParams;
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can bulk create
  if (!isCoach) {
    notFound();
  }

  // Fetch seasons and templates
  const [seasons, templates] = await Promise.all([
    prisma.season.findMany({
      where: { teamId: team.id, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.practiceTemplate.findMany({
      where: { teamId: team.id },
      select: {
        id: true,
        name: true,
        defaultStartTime: true,
        defaultEndTime: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Must have at least one season
  if (seasons.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/${teamSlug}/practices`}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Practices
          </Link>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            Create Multiple Practices
          </h1>
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-amber-400 text-sm">
              You need at least one active season to create practices.
              <Link
                href={`/${teamSlug}/settings`}
                className="ml-1 underline hover:no-underline"
              >
                Create a season
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${teamSlug}/practices`}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Practices
        </Link>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <BulkPracticeCreator
          teamSlug={teamSlug}
          seasons={seasons}
          templates={templates}
          initialDate={dateParam}
          initialSeasonId={seasonIdParam}
        />
      </div>
    </div>
  );
}
