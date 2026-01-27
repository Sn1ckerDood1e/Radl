import { redirect } from 'next/navigation';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { DashboardWithOnboarding } from '@/components/dashboard/dashboard-with-onboarding';
import { CoachDashboard } from '@/components/dashboard/coach-dashboard';
import { AthleteDashboard } from '@/components/dashboard/athlete-dashboard';
import { sortAnnouncementsByPriority, buildActiveAnnouncementsQuery } from '@/lib/utils/announcement-helpers';
import { aggregateFleetHealth } from '@/lib/equipment/readiness';
import {
  getTodaysPracticesForCoach,
  getAttentionItems,
  getUsageTrendsData,
  getAthleteNextPractice,
} from '@/lib/dashboard/queries';

interface TeamDashboardPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function TeamDashboardPage({ params }: TeamDashboardPageProps) {
  const { teamSlug } = await params;

  // Get validated claims with cookie-based clubId
  const { user, clubId, roles, error } = await getClaimsForApiRoute();

  if (error || !user) {
    redirect('/login');
  }

  // Find the team by slug first to allow switching
  const teamBySlug = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { id: true },
  });

  // Use the team from URL slug, or fall back to current clubId
  const teamId = teamBySlug?.id ?? clubId;

  if (!teamId) {
    redirect('/create-team');
  }

  // Verify user has membership in this team (ClubMembership or TeamMember)
  const [clubMembership, teamMember] = await Promise.all([
    prisma.clubMembership.findFirst({
      where: { clubId: teamId, userId: user.id, isActive: true },
    }),
    prisma.teamMember.findFirst({
      where: { teamId: teamId, userId: user.id },
    }),
  ]);

  if (!clubMembership && !teamMember) {
    redirect('/create-team');
  }

  // Get user's role for this team
  const userRoles = clubMembership?.roles ?? (teamMember ? [teamMember.role] : []);
  const isCoach = userRoles.includes('COACH');

  // Fetch team info (needed for both roles)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!team) {
    redirect('/create-team');
  }

  // Build announcements query (shared between roles)
  const announcementsWhere = buildActiveAnnouncementsQuery(teamId);

  if (isCoach) {
    // Coach: Fetch all dashboard data in parallel
    const [
      { todaysPractices, nextPractice },
      attentionItems,
      { sparklineData, totalHours, seasonName },
      announcementsRaw,
      equipment,
      teamSettings,
      openDamageReportCount,
    ] = await Promise.all([
      getTodaysPracticesForCoach(teamId),
      getAttentionItems(teamId, teamSlug),
      getUsageTrendsData(teamId),
      prisma.announcement.findMany({
        where: announcementsWhere,
        include: {
          readReceipts: {
            where: { userId: user.id },
          },
          practice: {
            select: {
              id: true,
              name: true,
              date: true,
            },
          },
        },
      }),
      prisma.equipment.findMany({
        where: { teamId: teamId, status: 'ACTIVE' },
        include: {
          damageReports: {
            where: { status: 'OPEN' },
            select: { id: true, severity: true, status: true, location: true },
          },
        },
      }),
      prisma.teamSettings.findUnique({
        where: { teamId: teamId },
        select: {
          readinessInspectSoonDays: true,
          readinessNeedsAttentionDays: true,
          readinessOutOfServiceDays: true,
        },
      }),
      prisma.damageReport.count({
        where: { teamId: teamId, status: 'OPEN' },
      }),
    ]);

    // Sort and format announcements
    const sortedAnnouncements = sortAnnouncementsByPriority(announcementsRaw);
    const announcements = sortedAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      priority: a.priority as 'INFO' | 'WARNING' | 'URGENT',
      createdAt: a.createdAt.toISOString(),
      isRead: a.readReceipts.length > 0,
      practice: a.practice
        ? {
            id: a.practice.id,
            name: a.practice.name,
            date: a.practice.date.toISOString(),
          }
        : null,
    }));

    // Build thresholds from settings or use defaults
    const thresholds = {
      inspectSoonDays: teamSettings?.readinessInspectSoonDays ?? 14,
      needsAttentionDays: teamSettings?.readinessNeedsAttentionDays ?? 21,
      outOfServiceDays: teamSettings?.readinessOutOfServiceDays ?? 30,
    };

    // Aggregate fleet health
    const fleetHealthCounts = aggregateFleetHealth(equipment, thresholds);
    const totalEquipment = equipment.length;

    // Transform practice data for TodaysScheduleWidget (needs Date objects)
    const todaysPracticesForWidget = todaysPractices.map((p) => ({
      ...p,
      startTime: p.startTime,
      endTime: p.endTime,
    }));

    const nextPracticeForWidget = nextPractice
      ? {
          id: nextPractice.id,
          name: nextPractice.name,
          date: nextPractice.startTime, // Use startTime as date proxy
          startTime: nextPractice.startTime,
        }
      : null;

    return (
      <DashboardWithOnboarding
        teamId={team.id}
        teamName={team.name}
        isCoach={isCoach}
      >
        <CoachDashboard
          teamSlug={teamSlug}
          todaysPractices={todaysPracticesForWidget}
          nextPractice={nextPracticeForWidget}
          statusCounts={fleetHealthCounts}
          totalEquipment={totalEquipment}
          sparklineData={sparklineData}
          totalUsageHours={totalHours}
          seasonName={seasonName}
          attentionItems={attentionItems}
          announcements={announcements}
          openDamageReportCount={openDamageReportCount}
        />
      </DashboardWithOnboarding>
    );
  } else {
    // Athlete: Fetch only athlete-relevant data in parallel
    const [
      { practice: nextPractice, assignment, unassignedPracticeCount },
      announcementsRaw,
    ] = await Promise.all([
      getAthleteNextPractice(teamId, user.id),
      prisma.announcement.findMany({
        where: announcementsWhere,
        include: {
          readReceipts: {
            where: { userId: user.id },
          },
          practice: {
            select: {
              id: true,
              name: true,
              date: true,
            },
          },
        },
      }),
    ]);

    // Sort and format announcements
    const sortedAnnouncements = sortAnnouncementsByPriority(announcementsRaw);
    const announcements = sortedAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      priority: a.priority as 'INFO' | 'WARNING' | 'URGENT',
      createdAt: a.createdAt.toISOString(),
      isRead: a.readReceipts.length > 0,
      practice: a.practice
        ? {
            id: a.practice.id,
            name: a.practice.name,
            date: a.practice.date.toISOString(),
          }
        : null,
    }));

    return (
      <DashboardWithOnboarding
        teamId={team.id}
        teamName={team.name}
        isCoach={isCoach}
      >
        <AthleteDashboard
          teamSlug={teamSlug}
          nextPractice={nextPractice}
          assignment={assignment}
          unassignedPracticeCount={unassignedPracticeCount}
          announcements={announcements}
        />
      </DashboardWithOnboarding>
    );
  }
}
