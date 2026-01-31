import { cookies } from 'next/headers';
import Link from 'next/link';
import { ClubForm } from '@/components/admin/clubs/club-form';

interface Facility {
  id: string;
  name: string;
}

interface FacilitiesResponse {
  facilities: Facility[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

interface PageProps {
  searchParams: Promise<{ facilityId?: string }>;
}

/**
 * Fetch all facilities for the dropdown.
 * Fetches all facilities (high perPage) since we need them for selection.
 */
async function getFacilities(): Promise<Facility[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${appUrl}/api/admin/facilities?perPage=100`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[admin/clubs/new] Failed to fetch facilities:', response.status);
      return [];
    }

    const data: FacilitiesResponse = await response.json();
    return data.facilities.map((f) => ({
      id: f.id,
      name: f.name,
    }));
  } catch (error) {
    console.error('[admin/clubs/new] Fetch error:', error);
    return [];
  }
}

/**
 * Create new club page for admin panel.
 *
 * Renders the ClubForm in create mode with facility selection.
 * Supports optional facilityId query param to pre-select facility
 * (useful when navigating from a facility detail page).
 *
 * After successful creation:
 * - Club record created with facility association
 * - TeamSettings record created
 * - Redirects back to club list
 */
export default async function NewClubPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preselectedFacilityId = params.facilityId;

  const facilities = await getFacilities();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/clubs"
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to Clubs
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
          Create Club
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Create a new club and assign it to a facility.
        </p>
      </div>

      <div className="max-w-xl">
        {facilities.length === 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-amber-400 font-medium mb-2">No Facilities Available</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              You need to create at least one facility before creating a club.
            </p>
            <Link
              href="/admin/facilities/new"
              className="mt-4 inline-block text-sm text-teal-400 hover:underline"
            >
              Create a Facility &rarr;
            </Link>
          </div>
        ) : (
          <ClubForm
            mode="create"
            facilities={facilities}
            preselectedFacilityId={preselectedFacilityId}
          />
        )}
      </div>
    </div>
  );
}
