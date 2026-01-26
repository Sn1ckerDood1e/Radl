import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Plus, ArrowLeft, Users } from 'lucide-react';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';

interface EventsPageProps {
  params: Promise<{ facilitySlug: string }>;
}

export default async function FacilityEventsPage({ params }: EventsPageProps) {
  const { facilitySlug } = await params;

  // Auth checks
  const { user, viewMode, error } = await getClaimsForApiRoute();
  if (error || !user) redirect('/login');
  if (viewMode !== 'facility') redirect('/');

  // Get facility and verify admin
  const facility = await prisma.facility.findUnique({
    where: { slug: facilitySlug },
    select: { id: true, name: true },
  });
  if (!facility) redirect('/');

  const membership = await prisma.facilityMembership.findFirst({
    where: {
      facilityId: facility.id,
      userId: user.id,
      isActive: true,
      roles: { has: 'FACILITY_ADMIN' },
    },
  });
  if (!membership) redirect('/');

  // Get facility-created practices (grouped by facilityEventId)
  const facilityPractices = await prisma.practice.findMany({
    where: {
      notes: { contains: '"facilityEventId":' },
      team: { facilityId: facility.id },
    },
    include: {
      team: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { date: 'desc' },
    take: 200,
  });

  // Group by facilityEventId
  const eventsMap = new Map<string, {
    id: string;
    name: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    clubs: { id: string; name: string; slug: string }[];
  }>();

  for (const practice of facilityPractices) {
    try {
      const metadata = JSON.parse(practice.notes || '{}');
      if (metadata.facilityEventId) {
        const existing = eventsMap.get(metadata.facilityEventId);
        if (existing) {
          if (!existing.clubs.some(c => c.id === practice.team.id)) {
            existing.clubs.push({
              id: practice.team.id,
              name: practice.team.name,
              slug: practice.team.slug,
            });
          }
        } else {
          eventsMap.set(metadata.facilityEventId, {
            id: metadata.facilityEventId,
            name: practice.name,
            date: practice.date,
            startTime: practice.startTime,
            endTime: practice.endTime,
            clubs: [{
              id: practice.team.id,
              name: practice.team.name,
              slug: practice.team.slug,
            }],
          });
        }
      }
    } catch {
      // Skip practices with invalid notes JSON
    }
  }

  const events = Array.from(eventsMap.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  // Split into upcoming and past
  const now = new Date();
  const upcomingEvents = events.filter(e => e.date >= now);
  const pastEvents = events.filter(e => e.date < now);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/facility/${facilitySlug}`}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Calendar className="h-6 w-6 text-[var(--accent)]" />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facility Events</h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            Cross-club events created for {facility.name}
          </p>
        </div>
        <Link
          href={`/facility/${facilitySlug}/events/new`}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-[var(--surface-1)] rounded-xl p-8 text-center border border-[var(--border-subtle)]">
          <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No facility events</h3>
          <p className="text-[var(--text-muted)] mb-4">
            Create events that appear on multiple clubs&apos; calendars at once.
          </p>
          <Link
            href={`/facility/${facilitySlug}/events/new`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Upcoming Events ({upcomingEvents.length})
              </h2>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{event.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {format(event.date, 'EEEE, MMMM d, yyyy')} &middot;{' '}
                          {format(event.startTime, 'h:mm a')} - {format(event.endTime, 'h:mm a')}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          <Users className="h-4 w-4 text-[var(--text-muted)]" />
                          <span className="text-sm text-[var(--text-muted)]">
                            {event.clubs.map(c => c.name).join(', ')}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                        {event.clubs.length} club{event.clubs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Past Events ({pastEvents.length})
              </h2>
              <div className="space-y-3">
                {pastEvents.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)] opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{event.name}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          {format(event.date, 'MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {event.clubs.map(c => c.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info note */}
      <div className="mt-8 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border-subtle)]">
        <p className="text-sm text-[var(--text-muted)]">
          <strong className="text-[var(--text-secondary)]">Note:</strong> Each club receives their own copy of the event. Clubs can modify their copy independently (change times, add notes).
        </p>
      </div>
    </div>
  );
}
