import { cookies } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClubListTable } from '@/components/admin/clubs/club-list-table';
import { FacilityFilter } from '@/components/admin/clubs/facility-filter';

/**
 * Club response from API.
 */
interface ClubWithStats {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  joinCode: string;
  facilityId: string | null;
  facility: {
    id: string;
    name: string;
    slug: string;
  } | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ClubsResponse {
  clubs: ClubWithStats[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

interface FacilityOption {
  id: string;
  name: string;
}

interface FacilitiesResponse {
  facilities: FacilityOption[];
}

interface PageProps {
  searchParams: Promise<{ facilityId?: string; page?: string }>;
}

/**
 * Fetch clubs from internal API with server-side cookies forwarded.
 */
async function getClubs(
  page: number,
  facilityId?: string
): Promise<ClubsResponse | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    page: page.toString(),
    perPage: '25',
  });
  if (facilityId) {
    params.set('facilityId', facilityId);
  }

  try {
    const response = await fetch(`${appUrl}/api/admin/clubs?${params}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[admin/clubs] API error:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[admin/clubs] Fetch error:', error);
    return null;
  }
}

/**
 * Fetch facilities list for filter dropdown.
 */
async function getFacilities(): Promise<FacilityOption[]> {
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
      console.error('[admin/clubs] Facilities API error:', response.status);
      return [];
    }

    const data: FacilitiesResponse = await response.json();
    return data.facilities;
  } catch (error) {
    console.error('[admin/clubs] Facilities fetch error:', error);
    return [];
  }
}

/**
 * Admin clubs list page.
 *
 * Displays paginated list of all clubs with facility filter and actions.
 * Super admin only (enforced by admin layout).
 *
 * Features:
 * - Paginated club list (25 per page)
 * - Facility filter dropdown
 * - Club name, facility, member count, join code columns
 * - Actions dropdown per club
 */
export default async function AdminClubsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const facilityId = params.facilityId;

  const [data, facilities] = await Promise.all([
    getClubs(page, facilityId),
    getFacilities(),
  ]);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clubs</h1>
            <p className="text-[var(--text-muted)]">
              Manage platform clubs
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
          <p className="text-[var(--text-muted)]">Failed to load clubs. Please try again.</p>
        </div>
      </div>
    );
  }

  const { clubs, pagination } = data;

  // Find selected facility name for display
  const selectedFacility = facilityId
    ? facilities.find((f) => f.id === facilityId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clubs</h1>
          <p className="text-[var(--text-muted)]">
            {pagination.total} club{pagination.total !== 1 ? 's' : ''}{' '}
            {selectedFacility ? `in ${selectedFacility.name}` : 'on the platform'}
          </p>
        </div>
        <Link href="/admin/clubs/new">
          <Button>
            <Plus className="h-4 w-4" />
            Create Club
          </Button>
        </Link>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-4">
        <FacilityFilter
          facilities={facilities}
          selectedFacilityId={facilityId}
          page={page}
        />
        {facilityId && (
          <Link
            href="/admin/clubs"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
          >
            Clear filter
          </Link>
        )}
      </div>

      {/* Table */}
      {clubs.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
          <Building2 className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">
            {facilityId
              ? 'No clubs found in this facility.'
              : 'No clubs found. Create your first club to get started.'}
          </p>
          <Link href="/admin/clubs/new" className="mt-4 inline-block">
            <Button variant="outline">
              <Plus className="h-4 w-4" />
              Create Club
            </Button>
          </Link>
        </div>
      ) : (
        <ClubListTable clubs={clubs} />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
            {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
            {pagination.total} clubs
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/clubs?page=${pagination.page - 1}${facilityId ? `&facilityId=${facilityId}` : ''}`}
              aria-disabled={pagination.page <= 1}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>
            <Link
              href={`/admin/clubs?page=${pagination.page + 1}${facilityId ? `&facilityId=${facilityId}` : ''}`}
              aria-disabled={pagination.page >= pagination.totalPages}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
