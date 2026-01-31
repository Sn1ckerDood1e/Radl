import { cookies } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FacilityListTable } from '@/components/admin/facilities/facility-list-table';

/**
 * Facility response from API.
 */
interface FacilityWithStats {
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

interface FacilitiesResponse {
  facilities: FacilityWithStats[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

/**
 * Fetch facilities from internal API with server-side cookies forwarded.
 */
async function getFacilities(
  page: number,
  search: string
): Promise<FacilitiesResponse | null> {
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
  if (search) {
    params.set('search', search);
  }

  try {
    const response = await fetch(`${appUrl}/api/admin/facilities?${params}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[admin/facilities] API error:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[admin/facilities] Fetch error:', error);
    return null;
  }
}

/**
 * Admin facilities list page.
 *
 * Displays paginated list of all platform facilities with stats and actions.
 * Super admin only (enforced by admin layout).
 *
 * Features:
 * - Paginated facility list (25 per page)
 * - Shows name, location, club count, member count, created date
 * - Actions dropdown per facility
 */
export default async function AdminFacilitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const search = params.search || '';

  const data = await getFacilities(page, search);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facilities</h1>
            <p className="text-[var(--text-muted)]">
              Manage platform facilities
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
          <p className="text-[var(--text-muted)]">Failed to load facilities. Please try again.</p>
        </div>
      </div>
    );
  }

  const { facilities, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facilities</h1>
          <p className="text-[var(--text-muted)]">
            {pagination.total} facilities on the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/facilities/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Facility
            </Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <FacilityListTable facilities={facilities} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
            {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
            {pagination.total} facilities
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/facilities?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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
              href={`/admin/facilities?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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
