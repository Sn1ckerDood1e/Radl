import { cookies } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuditLogTable, type AuditLogItem } from '@/components/admin/audit/audit-log-table';
import { AuditFilters } from '@/components/admin/audit/audit-filters';

interface AuditLogsResponse {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

interface PageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

/**
 * Fetch audit logs from internal API with server-side cookies forwarded.
 */
async function getAuditLogs(
  page: number,
  filters: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AuditLogsResponse | null> {
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

  if (filters.action) params.set('action', filters.action);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  try {
    const response = await fetch(`${appUrl}/api/admin/audit-logs?${params}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[admin/audit] API error:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('[admin/audit] Fetch error:', error);
    return null;
  }
}

/**
 * Build query string for pagination links preserving filters.
 */
function buildQueryString(
  page: number,
  filters: { action?: string; userId?: string; startDate?: string; endDate?: string }
): string {
  const params = new URLSearchParams({ page: page.toString() });
  if (filters.action) params.set('action', filters.action);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params.toString();
}

/**
 * Admin audit log page.
 *
 * Displays paginated list of all audit log entries with filters.
 * Super admin only (enforced by admin layout).
 *
 * Features:
 * - Paginated audit log list (25 per page)
 * - Filter by action type, user ID, date range
 * - Expandable rows with before/after state diff
 * - CSV export button
 */
export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const filters = {
    action: params.action,
    userId: params.userId,
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const data = await getAuditLogs(page, filters);

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Log</h1>
            <p className="text-[var(--text-muted)]">Review security-critical actions</p>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
          <p className="text-[var(--text-muted)]">Failed to load audit logs. Please try again.</p>
        </div>
      </div>
    );
  }

  const { logs, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Log</h1>
          <p className="text-[var(--text-muted)]">
            {pagination.total} entries recorded
          </p>
        </div>
      </div>

      {/* Filters */}
      <AuditFilters initialFilters={filters} />

      {/* Table */}
      <AuditLogTable logs={logs} />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(pagination.page - 1) * pagination.perPage + 1} to{' '}
            {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
            {pagination.total} entries
          </p>
          <div className="flex gap-2">
            <Link
              href={`/admin/audit?${buildQueryString(pagination.page - 1, filters)}`}
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
              href={`/admin/audit?${buildQueryString(pagination.page + 1, filters)}`}
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
