import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireTeam } from '@/lib/auth/authorize';
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

  const regatta = await prisma.regatta.findFirst({
    where: { id, teamId: team.id },
    include: {
      season: { select: { id: true, name: true } },
      entries: {
        include: {
          entryLineup: {
            include: {
              boat: { select: { id: true, name: true, boatClass: true } },
              seats: {
                include: {
                  athlete: { select: { id: true, displayName: true } },
                },
                orderBy: { position: 'asc' },
              },
            },
          },
          notificationConfig: {
            select: { leadTimeMinutes: true, notificationSent: true },
          },
        },
        orderBy: { scheduledTime: 'asc' },
      },
    },
  });

  if (!regatta) notFound();

  // Get team athletes for lineup assignment
  const athletes = await prisma.athleteProfile.findMany({
    where: {
      teamMember: { teamId: team.id },
    },
    select: {
      id: true,
      displayName: true,
      sidePreference: true,
      canBow: true,
      canCox: true,
    },
    orderBy: { displayName: 'asc' },
  });

  // Get available boats
  const boats = await prisma.equipment.findMany({
    where: {
      teamId: team.id,
      type: 'SHELL',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      boatClass: true,
    },
    orderBy: { name: 'asc' },
  });

  const timezone = regatta.timezone || 'America/New_York';
  const isCoach = claims.user_role === 'COACH';

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

      {/* Client component for interactive features */}
      <RegattaDetailClient
        teamSlug={teamSlug}
        regatta={{
          id: regatta.id,
          name: regatta.name,
          timezone,
          source: regatta.source,
          entries: regatta.entries.map((e) => ({
            id: e.id,
            eventName: e.eventName,
            scheduledTime: e.scheduledTime.toISOString(),
            meetingLocation: e.meetingLocation,
            meetingTime: e.meetingTime?.toISOString(),
            notes: e.notes,
            status: e.status,
            heat: e.heat,
            lane: e.lane,
            placement: e.placement,
            entryLineup: e.entryLineup
              ? {
                  boat: e.entryLineup.boat,
                  seats: e.entryLineup.seats.map((s) => ({
                    position: s.position,
                    athlete: { id: s.athlete.id, displayName: s.athlete.displayName },
                  })),
                }
              : null,
            notificationConfig: e.notificationConfig,
          })),
        }}
        athletes={athletes}
        boats={boats}
        isCoach={isCoach}
        initialCachedAt={Date.now()}
      />
    </div>
  );
}
