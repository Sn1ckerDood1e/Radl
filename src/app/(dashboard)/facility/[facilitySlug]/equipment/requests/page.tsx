import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { EquipmentRequestPanel } from '@/components/facility/equipment-request-panel';

interface RequestsPageProps {
  params: Promise<{ facilitySlug: string }>;
}

export default async function EquipmentRequestsPage({ params }: RequestsPageProps) {
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

  // Get all bookings for facility equipment
  const bookings = await prisma.equipmentBooking.findMany({
    where: {
      equipment: { facilityId: facility.id },
    },
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          type: true,
          boatClass: true,
        },
      },
      club: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      practice: {
        select: {
          id: true,
          name: true,
          date: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // PENDING first (alphabetically)
      { createdAt: 'desc' },
    ],
  });

  // Serialize dates for client component
  const serializedBookings = bookings.map((b) => ({
    ...b,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    practice: b.practice
      ? {
          ...b.practice,
          date: b.practice.date.toISOString(),
        }
      : null,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/facility/${facilitySlug}/equipment`}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <ClipboardList className="h-6 w-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Equipment Requests</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Manage booking requests for {facility.name} shared equipment
        </p>
      </div>

      <EquipmentRequestPanel bookings={serializedBookings} />
    </div>
  );
}
