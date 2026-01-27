// ============================================================================
// CoachDashboard Component
// ============================================================================
// Coach-specific dashboard layout implementing priority hero pattern.
// Schedule hero -> Fleet + Usage grid -> Quick Actions -> Announcements

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { ReadinessStatus } from '@/lib/equipment/readiness';
import { TodaysScheduleWidget } from './todays-schedule-widget';
import { FleetHealthWidget } from '@/components/equipment/fleet-health-widget';
import { UsageTrendsWidget } from './usage-trends-widget';
import { QuickActionsWidget } from './quick-actions-widget';
import { AnnouncementList } from '@/components/announcements/announcement-list';

// ============================================================================
// Types
// ============================================================================

interface CoachDashboardProps {
  teamSlug: string;
  // Today's Schedule (hero)
  todaysPractices: Array<{
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    athleteCount: number;
    blockCount: number;
  }>;
  nextPractice: {
    id: string;
    name: string;
    date: Date;
    startTime: Date;
  } | null;
  // Fleet Health
  statusCounts: Record<ReadinessStatus, number>;
  totalEquipment: number;
  // Usage Trends
  sparklineData: number[];
  totalUsageHours: number;
  seasonName?: string;
  // Quick Actions
  attentionItems: Array<{
    type: 'equipment_inspection' | 'lineup_needed' | 'practice_unpublished';
    count: number;
    label: string;
    href: string;
  }>;
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
  // Damage reports
  openDamageReportCount: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Coach dashboard layout with priority hero pattern.
 *
 * Layout structure:
 * 1. Welcome header (kept from existing pattern)
 * 2. Alert banner if open damage reports exist
 * 3. Hero: TodaysScheduleWidget (full width, prominent)
 * 4. Secondary row: FleetHealthWidget + UsageTrendsWidget (2-col grid)
 * 5. QuickActionsWidget (full width)
 * 6. AnnouncementList at bottom
 *
 * This is a server component accepting pre-fetched data as props.
 */
export function CoachDashboard({
  teamSlug,
  todaysPractices,
  nextPractice,
  statusCounts,
  totalEquipment,
  sparklineData,
  totalUsageHours,
  seasonName,
  attentionItems,
  announcements,
  openDamageReportCount,
}: CoachDashboardProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Alert banner for open damage reports */}
      {openDamageReportCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-400">
                {openDamageReportCount === 1
                  ? '1 open damage report requires attention'
                  : `${openDamageReportCount} open damage reports require attention`}
              </p>
            </div>
            <Link
              href={`/${teamSlug}/equipment?filter=damage`}
              className="text-sm font-medium text-red-400 hover:text-red-300 whitespace-nowrap"
            >
              View reports
            </Link>
          </div>
        </div>
      )}

      {/* Hero: Today's Schedule */}
      <TodaysScheduleWidget
        teamSlug={teamSlug}
        practices={todaysPractices}
        nextPractice={nextPractice}
      />

      {/* Secondary row: Fleet Health + Usage Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FleetHealthWidget
          teamSlug={teamSlug}
          statusCounts={statusCounts}
          totalEquipment={totalEquipment}
        />
        <UsageTrendsWidget
          teamSlug={teamSlug}
          sparklineData={sparklineData}
          totalHours={totalUsageHours}
          seasonName={seasonName}
        />
      </div>

      {/* Quick Actions */}
      <QuickActionsWidget teamSlug={teamSlug} items={attentionItems} />

      {/* Announcements */}
      <AnnouncementList
        teamSlug={teamSlug}
        initialAnnouncements={announcements}
        showEmpty={true}
        isCoach={true}
      />
    </div>
  );
}
