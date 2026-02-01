'use client';

import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Shield, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Membership {
  id: string;
  name: string;
  slug: string;
  roles: string[];
  facilityId: string | null;
  facilityName: string | null;
  joinedAt: string | Date;
}

interface MembershipListProps {
  /**
   * List of memberships to display.
   */
  memberships: Membership[];
  /**
   * Callback when Edit Roles action is clicked.
   */
  onEditRoles?: (membership: Membership) => void;
  /**
   * Callback when Remove action is clicked.
   */
  onRemove?: (membership: Membership) => void;
}

/**
 * Table displaying user's club memberships.
 *
 * Shows:
 * - Facility name (parent organization)
 * - Club name
 * - Roles as badges
 * - Join date (relative)
 * - Actions (Edit Roles, Remove) when callbacks provided
 *
 * Empty state shown when no memberships.
 */
export function MembershipList({ memberships, onEditRoles, onRemove }: MembershipListProps) {
  const hasActions = onEditRoles || onRemove;
  if (memberships.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        No memberships found
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Facility</th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Club</th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Roles</th>
            <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Joined</th>
            {hasActions && (
              <th className="p-3 text-right text-sm font-medium text-[var(--text-muted)]">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-[var(--surface-1)]">
          {memberships.map((m) => (
            <tr key={m.id} className="border-b border-[var(--border-subtle)] last:border-0">
              <td className="p-3 text-sm text-[var(--text-secondary)]">
                {m.facilityName || '-'}
              </td>
              <td className="p-3 text-sm font-medium text-[var(--text-primary)]">
                {m.name}
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">
                  {m.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-3 text-sm text-[var(--text-muted)]">
                {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
              </td>
              {hasActions && (
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEditRoles && (
                        <DropdownMenuItem onClick={() => onEditRoles(m)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Edit Roles
                        </DropdownMenuItem>
                      )}
                      {onRemove && (
                        <DropdownMenuItem
                          onClick={() => onRemove(m)}
                          variant="destructive"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove from Club
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
