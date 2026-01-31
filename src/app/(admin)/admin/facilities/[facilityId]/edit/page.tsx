import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FacilityForm } from '@/components/admin/facilities/facility-form';
import { FacilityDeleteSection } from './facility-delete-section';

/**
 * Facility data structure from API.
 */
interface Facility {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  clubCount: number;
  memberCount: number;
}

interface Props {
  params: Promise<{ facilityId: string }>;
}

/**
 * Edit facility page for admin panel.
 *
 * Fetches existing facility data and renders FacilityForm in edit mode.
 * Includes danger zone section for facility deletion.
 *
 * After successful update:
 * - Facility record updated in database
 * - Redirects back to facility list
 *
 * Delete section:
 * - Fetches cascade impact preview
 * - Requires typing exact facility name to confirm
 */
export default async function EditFacilityPage({ params }: Props) {
  const { facilityId } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const res = await fetch(`${appUrl}/api/admin/facilities/${facilityId}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error('Failed to fetch facility');
  }

  const data = await res.json();
  const facility: Facility = data.facility;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/facilities"
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to Facilities
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
          Edit Facility
        </h1>
        <p className="text-[var(--text-muted)]">{facility.name}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <FacilityForm
          mode="edit"
          facilityId={facilityId}
          defaultValues={{
            name: facility.name,
            slug: facility.slug,
            address: facility.address || '',
            city: facility.city || '',
            state: facility.state || '',
            country: facility.country || 'US',
            timezone: facility.timezone || 'America/New_York',
            phone: facility.phone || '',
            email: facility.email || '',
            website: facility.website || '',
            description: facility.description || '',
          }}
        />

        {/* Danger Zone */}
        <FacilityDeleteSection
          facilityId={facilityId}
          facilityName={facility.name}
        />
      </div>
    </div>
  );
}
