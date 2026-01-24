import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, MapPin, Clock, RefreshCw } from 'lucide-react';
import { RegattaDetailClient } from './regatta-detail-client';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const regatta = await prisma.regatta.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: regatta ? `${regatta.name} | RowOps` : 'Regatta | RowOps' };
}

interface PageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function RegattaDetailPage({ params }: PageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Simplified query - only fetch data needed for server-side header
  // Full regatta data (with entries) is fetched client-side via useOfflineRegatta hook
  const regatta = await prisma.regatta.findFirst({
    where: { id, teamId: team.id },
    select: {
      id: true,
      name: true,
      location: true,
      venue: true,
      timezone: true,
      startDate: true,
      endDate: true,
      source: true,
      lastSyncAt: true,
      season: { select: { name: true } },
    },
  });

  if (!regatta) notFound();

  const timezone = regatta.timezone || 'America/New_York';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/${teamSlug}/regattas`}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Regattas
      </Link>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">{regatta.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(regatta.startDate, 'MMMM d, yyyy')}
                {regatta.endDate && ` - ${format(regatta.endDate, 'MMMM d, yyyy')}`}
              </span>
              {regatta.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {regatta.location}
                  {regatta.venue && ` - ${regatta.venue}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {timezone}
              </span>
            </div>
            {regatta.season && (
              <span className="text-xs text-zinc-500 mt-2 inline-block">
                {regatta.season.name}
              </span>
            )}
          </div>

          {regatta.source === 'REGATTA_CENTRAL' && regatta.lastSyncAt && (
            <div className="text-right text-sm text-zinc-500">
              <div className="flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                <span>Last synced: {format(regatta.lastSyncAt, 'MMM d, h:mm a')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client component for interactive features - fetches entries via offline-aware hook */}
      <RegattaDetailClient
        teamSlug={teamSlug}
        regattaId={id}
        regattaName={regatta.name}
        timezone={timezone}
        isCoach={isCoach}
      />
    </div>
  );
}
