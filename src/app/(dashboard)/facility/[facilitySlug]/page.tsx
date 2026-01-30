import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { Building2, Ship, Calendar, Settings } from 'lucide-react';

interface FacilityDashboardPageProps {
  params: Promise<{ facilitySlug: string }>;
}

export default async function FacilityDashboardPage({ params }: FacilityDashboardPageProps) {
  const { facilitySlug } = await params;

  // Get validated claims
  const { user, facilityId, viewMode, error } = await getClaimsForApiRoute();

  if (error || !user) {
    redirect('/login');
  }

  // Verify user is in facility view mode
  if (viewMode !== 'facility') {
    redirect('/');
  }

  // Get facility by slug
  const facility = await prisma.facility.findUnique({
    where: { slug: facilitySlug },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      city: true,
      state: true,
      email: true,
      phone: true,
    },
  });

  if (!facility) {
    redirect('/');
  }

  // Verify user has FACILITY_ADMIN role for this facility
  const facilityMembership = await prisma.facilityMembership.findFirst({
    where: {
      facilityId: facility.id,
      userId: user.id,
      isActive: true,
      roles: { has: 'FACILITY_ADMIN' },
    },
  });

  if (!facilityMembership) {
    redirect('/');
  }

  // Get clubs under this facility with stats
  const clubs = await prisma.team.findMany({
    where: { facilityId: facility.id },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoUrl: true,
      _count: {
        select: {
          members: true,
          equipment: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Get facility-level equipment count
  const facilityEquipmentCount = await prisma.equipment.count({
    where: { facilityId: facility.id, ownerType: 'FACILITY' },
  });

  // Get shared equipment count (facility-owned + club isShared)
  const sharedEquipmentCount = await prisma.equipment.count({
    where: {
      facilityId: facility.id,
      OR: [
        { ownerType: 'FACILITY' },
        { isShared: true }
      ]
    },
  });

  // Get upcoming events count (practices in next 7 days across all clubs)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const upcomingEventsCount = await prisma.practice.count({
    where: {
      team: { facilityId: facility.id },
      startTime: {
        gte: new Date(),
        lte: sevenDaysFromNow,
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{facility.name}</h1>
            <p className="text-[var(--text-muted)]">Facility Overview</p>
          </div>
        </div>
        {(facility.city || facility.state) && (
          <p className="text-[var(--text-secondary)] mt-2">
            {[facility.city, facility.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{clubs.length}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Clubs</div>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {clubs.reduce((sum, c) => sum + c._count.members, 0)}
          </div>
          <div className="text-sm text-[var(--text-muted)]">Total Athletes</div>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{sharedEquipmentCount}</div>
          <div className="text-sm text-[var(--text-muted)]">Shared Equipment</div>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{upcomingEventsCount}</div>
          <div className="text-sm text-[var(--text-muted)]">Upcoming Events</div>
        </div>
      </div>

      {/* Navigation Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Clubs */}
        <Link
          href={`/facility/${facilitySlug}/clubs`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-teal-500/20">
              <Building2 className="h-7 w-7 text-teal-500" />
            </div>
            <span className="text-3xl font-bold text-[var(--text-primary)]">{clubs.length}</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Clubs</h3>
          <p className="text-sm text-[var(--text-muted)]">Manage member clubs</p>
        </Link>

        {/* Shared Equipment */}
        <Link
          href={`/facility/${facilitySlug}/equipment`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-teal-500/20">
              <Ship className="h-7 w-7 text-teal-500" />
            </div>
            <span className="text-3xl font-bold text-[var(--text-primary)]">{sharedEquipmentCount}</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Shared Equipment</h3>
          <p className="text-sm text-[var(--text-muted)]">Facility and shared boats</p>
        </Link>

        {/* Events */}
        <Link
          href={`/facility/${facilitySlug}/events`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-teal-500/20">
              <Calendar className="h-7 w-7 text-teal-500" />
            </div>
            <span className="text-3xl font-bold text-[var(--text-primary)]">{upcomingEventsCount}</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Events</h3>
          <p className="text-sm text-[var(--text-muted)]">Upcoming practices</p>
        </Link>

        {/* Settings */}
        <Link
          href={`/facility/${facilitySlug}/settings`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl bg-[var(--surface-3)] flex items-center justify-center">
              <Settings className="h-7 w-7 text-[var(--text-secondary)]" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Settings</h3>
          <p className="text-sm text-[var(--text-muted)]">Facility preferences</p>
        </Link>
      </div>

      {/* Clubs Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Clubs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/${club.slug}`}
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--border-subtle)] hover:border-[var(--border)] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold bg-teal-600">
                    {club.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{club.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">/{club.slug}</p>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
                <span>{club._count.members} members</span>
                <span>{club._count.equipment} equipment</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
