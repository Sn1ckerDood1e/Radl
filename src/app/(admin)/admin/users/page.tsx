import { cookies } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserListTable } from '@/components/admin/users/user-list-table';
import { UserSearch } from '@/components/admin/users/user-search';

/**
 * User response from API.
 */
interface UserWithMemberships {
  id: string;
  email: string | undefined;
  displayName: string | undefined;
  phone: string | undefined;
  createdAt: string;
  lastSignInAt: string | undefined;
  emailConfirmed: boolean;
  facilityCount: number;
  clubCount: number;
  facilities: {
    id: string;
    name: string;
    roles: string[];
  }[];
  clubs: {
    id: string;
    name: string;
    roles: string[];
    facilityName: string | null;
  }[];
}

interface UsersResponse {
  users: UserWithMemberships[];
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
 * Fetch users from internal API with server-side cookies forwarded.
 */
async function getUsers(
  page: number,
  search: string
): Promise<UsersResponse | null> {
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
    const response = await fetch(`${appUrl}/api/admin/users?${params}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[admin/users] API error:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[admin/users] Fetch error:', error);
    return null;
  }
}

/**
 * Admin users list page.
 *
 * Displays paginated list of all platform users with search and actions.
 * Super admin only (enforced by admin layout).
 *
 * Features:
 * - Paginated user list (25 per page)
 * - Search by email, name, facility, or club
 * - Status badges (Active/Deactivated)
 * - Actions dropdown per user
 */
export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const search = params.search || '';

  const data = await getUsers(page, search);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
            <p className="text-[var(--text-muted)]">
              Manage platform users
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
          <p className="text-[var(--text-muted)]">Failed to load users. Please try again.</p>
        </div>
      </div>
    );
  }

  const { users, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
          <p className="text-[var(--text-muted)]">
            {pagination.total} users on the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users/bulk">
            <Button variant="outline">
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/admin/users/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <UserSearch initialSearch={search} />

      {/* Table */}
      <UserListTable users={users} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
            {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
            {pagination.total} users
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/users?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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
              href={`/admin/users?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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
