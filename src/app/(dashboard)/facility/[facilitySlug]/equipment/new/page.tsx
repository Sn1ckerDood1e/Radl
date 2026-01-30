import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { FacilityEquipmentForm } from '@/components/equipment/facility-equipment-form';

interface NewFacilityEquipmentPageProps {
  params: Promise<{ facilitySlug: string }>;
}

export default async function NewFacilityEquipmentPage({ params }: NewFacilityEquipmentPageProps) {
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
    redirect(`/facility/${facilitySlug}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-[var(--text-muted)]">
          <li>
            <Link href={`/facility/${facilitySlug}/equipment`} className="hover:text-teal-400 transition-colors">
              Shared Equipment
            </Link>
          </li>
          <li>/</li>
          <li className="text-[var(--text-primary)]">Add Equipment</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Add Facility Equipment</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Add a new piece of equipment to {facility.name}&apos;s shared inventory.
        </p>
      </div>

      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] p-6">
        <FacilityEquipmentForm facilitySlug={facilitySlug} facilityId={facility.id} />
      </div>
    </div>
  );
}
