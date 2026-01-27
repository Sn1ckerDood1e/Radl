// ============================================================================
// AthleteDashboard Component
// ============================================================================
// Athlete-specific dashboard layout - simple, focused "where do I need to be" view.
// Next Practice hero -> Announcements (if any)

import { NextPracticeWidget } from './next-practice-widget';
import { AnnouncementList } from '@/components/announcements/announcement-list';

// ============================================================================
// Types
// ============================================================================

interface AthleteDashboardProps {
  teamSlug: string;
  // Next Practice (hero)
  nextPractice: {
    id: string;
    name: string;
    date: Date;
    startTime: Date;
    endTime: Date;
  } | null;
  assignment: {
    blockType: 'WATER' | 'ERG' | 'LAND' | 'MEETING';
    boatName?: string;
    boatClass?: string;
    seatPosition?: number;
    seatSide?: 'PORT' | 'STARBOARD' | null;
    groupName?: string;
  } | null;
  unassignedPracticeCount: number;
  // Announcements
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    priority: 'INFO' | 'WARNING' | 'URGENT';
    createdAt: string;
    isRead: boolean;
    practice: { id: string; name: string; date: string } | null;
  }>;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Athlete dashboard layout - simple and focused.
 *
 * Layout structure:
 * 1. Hero: NextPracticeWidget (full width, prominent - their primary info)
 * 2. AnnouncementList (if any announcements exist)
 *
 * No fleet health, no usage trends, no quick actions.
 * Athletes just need to know where to be.
 *
 * This is a server component accepting pre-fetched data as props.
 */
export function AthleteDashboard({
  teamSlug,
  nextPractice,
  assignment,
  unassignedPracticeCount,
  announcements,
}: AthleteDashboardProps) {
  const hasAnnouncements = announcements.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero: Next Practice */}
      <NextPracticeWidget
        teamSlug={teamSlug}
        practice={nextPractice}
        assignment={assignment}
        unassignedPracticeCount={unassignedPracticeCount}
      />

      {/* Announcements (only if there are any) */}
      {hasAnnouncements && (
        <AnnouncementList
          teamSlug={teamSlug}
          initialAnnouncements={announcements}
          showEmpty={false}
          isCoach={false}
        />
      )}
    </div>
  );
}
