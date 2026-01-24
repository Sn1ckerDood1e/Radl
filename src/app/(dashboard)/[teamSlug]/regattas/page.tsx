import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireTeam } from '@/lib/auth/authorize';
import { format } from 'date-fns';
import { Calendar, MapPin, Plus, ChevronRight, Trophy } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Regattas | RowOps',
};

interface PageProps {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default async function RegattasPage({ params, searchParams }: PageProps) {
  const { teamSlug } = await params;
  const { seasonId } = await searchParams;

  const { claims } = await requireTeam();
  if (!claims.team_id) redirect('/create-team');

  // Verify slug matches team
  const team = await prisma.team.findUnique({
    where: { id: claims.team_id },
    select: { id: true, slug: true },
  });

  if (!team || team.slug !== teamSlug) {
    redirect('/create-team');
  }

  // Get active seasons for filter
  const seasons = await prisma.season.findMany({
    where: { teamId: team.id, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });

  // Get regattas
  const where: Record<string, unknown> = { teamId: team.id };
  if (seasonId) {
    where.seasonId = seasonId;
  }

  const regattas = await prisma.regatta.findMany({
    where,
    include: {
      season: { select: { id: true, name: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  // Split into upcoming and past
  const now = new Date();
  const upcomingRegattas = regattas.filter((r) => r.startDate >= now);
  const pastRegattas = regattas.filter((r) => r.startDate < now);

  const isCoach = claims.user_role === 'COACH';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Regattas</h1>
        {isCoach && (
          <Link
            href={`/${teamSlug}/regattas/new`}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            <Plus className="h-5 w-5" />
            Add Regatta
          </Link>
        )}
      </div>

      {/* Season filter */}
      {seasons.length > 1 && (
        <div className="mb-6">
          <label className="text-sm text-zinc-400 mr-2">Season:</label>
          <select
            className="border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-1.5"
            defaultValue={seasonId || ''}
          >
            <option value="">All Seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upcoming regattas */}
      {upcomingRegattas.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-300">Upcoming</h2>
          <div className="space-y-3">
            {upcomingRegattas.map((regatta) => (
              <Link
                key={regatta.id}
                href={`/${teamSlug}/regattas/${regatta.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg text-white">{regatta.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(regatta.startDate, 'MMM d, yyyy')}
                        {regatta.endDate &&
                          !isSameDay(regatta.startDate, regatta.endDate) &&
                          ` - ${format(regatta.endDate, 'MMM d')}`}
                      </span>
                      {regatta.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {regatta.location}
                        </span>
                      )}
                    </div>
                    {regatta.season && (
                      <span className="text-xs text-zinc-500 mt-1 inline-block">
                        {regatta.season.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span className="text-sm">{regatta._count.entries} entries</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Past regattas */}
      {pastRegattas.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-zinc-500">Past</h2>
          <div className="space-y-3 opacity-75">
            {pastRegattas.map((regatta) => (
              <Link
                key={regatta.id}
                href={`/${teamSlug}/regattas/${regatta.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-white">{regatta.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                      <span>{format(regatta.startDate, 'MMM d, yyyy')}</span>
                      {regatta.location && <span>{regatta.location}</span>}
                    </div>
                  </div>
                  <span className="text-sm text-zinc-600">{regatta._count.entries} entries</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {regattas.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Trophy}
            title="No regattas yet"
            description="Create your first regatta to start planning race day."
            action={isCoach ? { label: "New Regatta", href: `/${teamSlug}/regattas/new` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
