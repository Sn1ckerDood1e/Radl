import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { RegattaForm } from '@/components/regatta/regatta-form';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'New Regatta | Radl',
};

interface PageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function NewRegattaPage({ params }: PageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can create regattas
  if (!isCoach) {
    redirect(`/${teamSlug}/regattas`);
  }

  // Get active seasons for dropdown
  const seasons = await prisma.season.findMany({
    where: { teamId: team.id, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });

  if (seasons.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-300">No active seasons found.</p>
          <p className="text-sm text-zinc-500 mt-2">
            Create a season first before adding regattas.
          </p>
          <Link
            href={`/${teamSlug}/settings/seasons`}
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            Manage Seasons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/${teamSlug}/regattas`}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Regattas
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">New Regatta</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <RegattaForm
          teamSlug={teamSlug}
          seasons={seasons.map((s) => ({ id: s.id, name: s.name }))}
          defaultSeasonId={seasons[0]?.id}
        />
      </div>
    </div>
  );
}
