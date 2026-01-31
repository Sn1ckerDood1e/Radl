'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClubActionsDropdown } from './club-actions-dropdown';

/**
 * Club data type matching API response.
 */
export interface ClubListItem {
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

interface ClubListTableProps {
  clubs: ClubListItem[];
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
 * Admin clubs list table component.
 *
 * Displays club data in a table format with:
 * - Name (link to detail page)
 * - Facility (link to facility)
 * - Members count
 * - Join Code (monospace)
 * - Created date
 * - Actions dropdown
 */
export function ClubListTable({ clubs }: ClubListTableProps) {
  // Track which dialogs are open (for move/delete - handled by parent in 38-06)
  const [moveClubId, setMoveClubId] = useState<string | null>(null);
  const [deleteClubId, setDeleteClubId] = useState<string | null>(null);

  if (clubs.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-[var(--text-muted)]">No clubs found.</p>
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
              Facility
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Members
            </th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
              Join Code
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
          {clubs.map((club) => (
            <tr
              key={club.id}
              className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)]/50"
            >
              <td className="p-3">
                <Link
                  href={`/admin/clubs/${club.id}`}
                  className="text-sm font-medium text-[var(--text-primary)] hover:underline"
                >
                  {club.name}
                </Link>
                <p className="text-xs text-[var(--text-muted)]">{club.slug}</p>
              </td>
              <td className="p-3 text-sm">
                {club.facility ? (
                  <Link
                    href={`/admin/facilities/${club.facility.id}`}
                    className="text-[var(--text-secondary)] hover:underline"
                  >
                    {club.facility.name}
                  </Link>
                ) : (
                  <span className="text-[var(--text-muted)]">No facility</span>
                )}
              </td>
              <td className="p-3 text-sm text-[var(--text-secondary)]">
                {club.memberCount}
              </td>
              <td className="p-3">
                <code className="text-xs bg-[var(--surface-2)] px-2 py-1 rounded font-mono text-[var(--text-secondary)]">
                  {club.joinCode}
                </code>
              </td>
              <td className="p-3 text-sm text-[var(--text-muted)]">
                {formatDate(club.createdAt)}
              </td>
              <td className="p-3 text-right">
                <ClubActionsDropdown
                  clubId={club.id}
                  clubName={club.name}
                  facilityId={club.facilityId}
                  onMoveClick={() => setMoveClubId(club.id)}
                  onDeleteClick={() => setDeleteClubId(club.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Move and delete dialogs will be added in 38-06 */}
      {/* For now, we just track the IDs */}
    </div>
  );
}
