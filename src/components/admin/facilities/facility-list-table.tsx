'use client';

import Link from 'next/link';
import { FacilityActionsDropdown } from './facility-actions-dropdown';

/**
 * Facility data type matching API response.
 */
export interface FacilityListItem {
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

interface FacilityListTableProps {
  facilities: FacilityListItem[];
}

/**
 * Format date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format location from city and state.
 */
function formatLocation(city: string | null, state: string | null): string {
  if (city && state) {
    return `${city}, ${state}`;
  }
  if (city) {
    return city;
  }
  if (state) {
    return state;
  }
  return '-';
}

/**
 * Admin facilities list table component.
 *
 * Displays facility data in a table format with:
 * - Name (link to detail page)
 * - Location (city, state)
 * - Club count
 * - Member count
 * - Created date
 * - Actions dropdown
 */
export function FacilityListTable({ facilities }: FacilityListTableProps) {
  if (facilities.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No facilities found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Name
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Location
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Clubs
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Members
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Created
            </th>
            <th className="p-3 text-right text-sm font-medium text-[var(--text-muted)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-[var(--surface-1)]">
          {facilities.map((facility) => (
            <tr
              key={facility.id}
              className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)]/50"
            >
              <td className="p-3">
                <Link
                  href={`/admin/facilities/${facility.id}`}
                  className="text-sm font-medium text-[var(--text-primary)] hover:underline"
                >
                  {facility.name}
                </Link>
              </td>
              <td className="p-3 text-sm text-[var(--text-secondary)]">
                {formatLocation(facility.city, facility.state)}
              </td>
              <td className="p-3 text-sm text-[var(--text-secondary)]">
                {facility.clubCount}
              </td>
              <td className="p-3 text-sm text-[var(--text-secondary)]">
                {facility.memberCount}
              </td>
              <td className="p-3 text-sm text-[var(--text-muted)]">
                {formatDate(facility.createdAt)}
              </td>
              <td className="p-3 text-right">
                <FacilityActionsDropdown
                  facilityId={facility.id}
                  facilityName={facility.name}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
