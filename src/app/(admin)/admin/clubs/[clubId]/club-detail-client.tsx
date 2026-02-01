'use client';

import { ClubMembersSection } from '@/components/admin/memberships/club-members-section';

interface ClubDetailClientProps {
  /**
   * The club ID to manage members for.
   */
  clubId: string;
  /**
   * The club name for display in dialogs.
   */
  clubName: string;
}

/**
 * Client component wrapper for club detail page.
 *
 * Renders the ClubMembersSection which requires client-side state
 * for dialog management and data fetching.
 *
 * @example
 * ```tsx
 * <ClubDetailClient clubId="abc-123" clubName="Rowing Club" />
 * ```
 */
export function ClubDetailClient({ clubId, clubName }: ClubDetailClientProps) {
  return <ClubMembersSection clubId={clubId} clubName={clubName} />;
}
