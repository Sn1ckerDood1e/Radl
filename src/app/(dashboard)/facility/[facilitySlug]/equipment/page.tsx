import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { Plus, AlertTriangle, Ban, ClipboardList } from 'lucide-react';

interface FacilityEquipmentPageProps {
  params: Promise<{ facilitySlug: string }>;
}

export default async function FacilityEquipmentPage({ params }: FacilityEquipmentPageProps) {
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

  // Count pending booking requests
  const pendingRequestCount = await prisma.equipmentBooking.count({
    where: {
      equipment: { facilityId: facility.id },
      status: 'PENDING',
    },
  });

  // Get facility-owned equipment with damage reports and booking status
  const equipment = await prisma.equipment.findMany({
    where: {
      facilityId: facility.id,
      ownerType: 'FACILITY'
    },
    include: {
      damageReports: {
        where: { status: 'OPEN' },
        select: {
          id: true,
          location: true,
          description: true,
          reportedBy: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { type: 'asc' },
      { name: 'asc' },
    ],
  });

  // Group equipment by type
  const groupedEquipment = equipment.reduce<Record<string, typeof equipment>>((groups, item) => {
    const type = item.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {});

  const typeOrder = ['SHELL', 'OAR', 'LAUNCH', 'OTHER'];
  const typeLabels: Record<string, string> = {
    SHELL: 'Shells',
    OAR: 'Oars',
    LAUNCH: 'Launches',
    OTHER: 'Other',
  };

  // Calculate availability status for each equipment
  const getAvailabilityStatus = (item: typeof equipment[0]) => {
    if (item.manualUnavailable) {
      return { status: 'unavailable', reason: item.manualUnavailableNote || 'Marked unavailable' };
    }
    if (item.damageReports.length > 0) {
      return { status: 'damaged', reason: `${item.damageReports.length} open damage report(s)` };
    }
    return { status: 'available', reason: null };
  };

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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Shared Equipment</h1>
          </div>
          <p className="text-[var(--text-muted)]">
            Manage facility-owned equipment available to all clubs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingRequestCount > 0 && (
            <Link
              href={`/facility/${facilitySlug}/equipment/requests`}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              {pendingRequestCount} Pending Request{pendingRequestCount !== 1 ? 's' : ''}
            </Link>
          )}
          <Link
            href={`/facility/${facilitySlug}/equipment/new`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Equipment
          </Link>
        </div>
      </div>

      {/* Equipment Count Summary */}
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {typeOrder.map((type) => {
            const items = groupedEquipment[type] || [];
            return (
              <div key={type}>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{items.length}</div>
                <div className="text-sm text-[var(--text-muted)]">{typeLabels[type]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment List by Type */}
      {equipment.length === 0 ? (
        <div className="text-center py-12 bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
          <p className="text-[var(--text-muted)] mb-4">No facility equipment yet</p>
          <Link
            href={`/facility/${facilitySlug}/equipment/new`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add First Equipment
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.map((type) => {
            const items = groupedEquipment[type];
            if (!items || items.length === 0) return null;

            return (
              <div key={type} className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                  <h2 className="font-semibold text-[var(--text-primary)]">
                    {typeLabels[type]} ({items.length})
                  </h2>
                </div>
                <div className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                      const availability = getAvailabilityStatus(item);
                      return (
                        <Link
                          key={item.id}
                          href={`/facility/${facilitySlug}/equipment/${item.id}`}
                          className="block p-4 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border)] transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-[var(--text-primary)] mb-1">{item.name}</h3>
                              {item.manufacturer && (
                                <p className="text-sm text-[var(--text-muted)]">{item.manufacturer}</p>
                              )}
                              {item.boatClass && (
                                <p className="text-sm text-[var(--text-secondary)]">{item.boatClass}</p>
                              )}
                            </div>
                            {/* Availability indicator */}
                            {availability.status === 'damaged' && (
                              <div className="ml-2" title={availability.reason || ''}>
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              </div>
                            )}
                            {availability.status === 'unavailable' && (
                              <div className="ml-2" title={availability.reason || ''}>
                                <Ban className="h-5 w-5 text-red-500" />
                              </div>
                            )}
                          </div>
                          {/* Status badge */}
                          <div className="flex items-center gap-2 mt-2">
                            {availability.status === 'available' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-500">
                                Available
                              </span>
                            )}
                            {availability.status === 'damaged' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500">
                                Damaged
                              </span>
                            )}
                            {availability.status === 'unavailable' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-500">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
