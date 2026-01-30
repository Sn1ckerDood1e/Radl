import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { Building2, Users, Ship, Calendar } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface ClubsPageProps {
  params: Promise<{ facilitySlug: string }>;
}

export default async function ClubsPage({ params }: ClubsPageProps) {
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

  // Get clubs under this facility with extended stats
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
          practices: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

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
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clubs</h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            Manage clubs at {facility.name}
          </p>
        </div>
      </div>

      {/* Clubs List */}
      {clubs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clubs yet"
          description="This facility doesn't have any clubs yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <Link
              key={club.id}
              href={`/facility/${facilitySlug}/clubs/${club.slug}`}
              className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--border-subtle)] hover:border-[var(--border)] transition-all"
            >
              {/* Club Header */}
              <div className="flex items-center gap-3 mb-4">
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold bg-teal-600">
                    {club.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">
                    {club.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] truncate">/{club.slug}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Users className="h-4 w-4" />
                  <span>{club._count.members} member{club._count.members !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Ship className="h-4 w-4" />
                  <span>{club._count.equipment} equipment</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Calendar className="h-4 w-4" />
                  <span>{club._count.practices} practice{club._count.practices !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Drill-down indicator */}
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">View details</span>
                <svg
                  className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-1 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
