import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';

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

  // Get shared equipment count
  const sharedEquipmentCount = await prisma.equipment.count({
    where: { facilityId: facility.id, isShared: true },
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
          <div className="text-sm text-[var(--text-muted)]">Clubs</div>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">
            {clubs.reduce((sum, c) => sum + c._count.members, 0)}
          </div>
          <div className="text-sm text-[var(--text-muted)]">Total Members</div>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{facilityEquipmentCount}</div>
          <div className="text-sm text-[var(--text-muted)]">Facility Equipment</div>
        </div>
        <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{sharedEquipmentCount}</div>
          <div className="text-sm text-[var(--text-muted)]">Shared Equipment</div>
        </div>
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
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: club.primaryColor }}
                  >
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

      {/* Quick Actions */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border-subtle)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Facility Admin Actions</h2>
        <p className="text-[var(--text-muted)] mb-4">
          As a facility admin, you can view data across all clubs. Click on a club above to drill down into their dashboard (read-only).
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1.5 bg-[var(--surface-2)] rounded-lg text-sm text-[var(--text-secondary)]">
            View club rosters
          </span>
          <span className="px-3 py-1.5 bg-[var(--surface-2)] rounded-lg text-sm text-[var(--text-secondary)]">
            View equipment across clubs
          </span>
          <span className="px-3 py-1.5 bg-[var(--surface-2)] rounded-lg text-sm text-[var(--text-secondary)]">
            View practice schedules
          </span>
        </div>
      </div>
    </div>
  );
}
