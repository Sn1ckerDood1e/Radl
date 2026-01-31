'use client';

import { UserActionsDropdown } from './user-actions-dropdown';

/**
 * User data type matching API response.
 */
export interface UserListItem {
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

interface UserListTableProps {
  users: UserListItem[];
}

/**
 * Format date for display.
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate user status based on email confirmation and last sign-in.
 * Note: Deactivated status is determined by banned_until in the API,
 * but that's only available in user detail. For list view, we show
 * Active/Unverified based on email confirmation.
 */
function getUserStatus(user: UserListItem): 'active' | 'unverified' {
  if (!user.emailConfirmed) return 'unverified';
  return 'active';
}

/**
 * Admin users list table component.
 *
 * Displays user data in a table format with:
 * - Email
 * - Display name
 * - Status badge
 * - Membership count (facilities + clubs)
 * - Created date
 * - Last login
 * - Actions dropdown
 */
export function UserListTable({ users }: UserListTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No users found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Email
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Name
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Status
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Memberships
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Created
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Last Login
            </th>
            <th className="p-3 text-right text-sm font-medium text-[var(--text-muted)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-[var(--surface-1)]">
          {users.map((user) => {
            const status = getUserStatus(user);
            const totalMemberships = user.facilityCount + user.clubCount;

            return (
              <tr
                key={user.id}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)]/50"
              >
                <td className="p-3 text-sm text-[var(--text-primary)]">
                  {user.email || '-'}
                </td>
                <td className="p-3 text-sm text-[var(--text-secondary)]">
                  {user.displayName || '-'}
                </td>
                <td className="p-3">
                  <StatusBadge status={status} />
                </td>
                <td className="p-3 text-sm text-[var(--text-secondary)]">
                  {totalMemberships > 0 ? (
                    <span title={`${user.facilityCount} facilities, ${user.clubCount} clubs`}>
                      {totalMemberships}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">None</span>
                  )}
                </td>
                <td className="p-3 text-sm text-[var(--text-muted)]">
                  {formatDate(user.createdAt)}
                </td>
                <td className="p-3 text-sm text-[var(--text-muted)]">
                  {formatDate(user.lastSignInAt)}
                </td>
                <td className="p-3 text-right">
                  <UserActionsDropdown user={user} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Status badge component.
 */
function StatusBadge({ status }: { status: 'active' | 'unverified' }) {
  const styles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    unverified: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const labels = {
    active: 'Active',
    unverified: 'Unverified',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
