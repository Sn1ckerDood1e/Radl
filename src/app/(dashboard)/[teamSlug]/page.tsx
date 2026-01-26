import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { DashboardWithOnboarding } from '@/components/dashboard/dashboard-with-onboarding';
import { AnnouncementList } from '@/components/announcements/announcement-list';
import { sortAnnouncementsByPriority, buildActiveAnnouncementsQuery } from '@/lib/utils/announcement-helpers';

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

  // Get team info and counts in parallel
  const announcementsWhere = buildActiveAnnouncementsQuery(teamId);
  const [team, equipmentCount, memberCount, pendingInvitationCount, openDamageReportCount, announcementsRaw] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
      },
    }),
    prisma.equipment.count({
      where: { teamId: teamId, status: 'ACTIVE' },
    }),
    prisma.teamMember.count({
      where: { teamId: teamId },
    }),
    prisma.invitation.count({
      where: { teamId: teamId, status: 'PENDING' },
    }),
    prisma.damageReport.count({
      where: { teamId: teamId, status: 'OPEN' },
    }),
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

  if (!team) {
    redirect('/create-team');
  }

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

  const dashboardContent = (
    <div className="max-w-5xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Welcome back
        </h1>
        <p className="text-[var(--text-secondary)]">
          Here's what's happening with your team
        </p>
      </div>

      {/* Alerts Section */}
      {isCoach && openDamageReportCount > 0 && (
        <Link
          href={`/${teamSlug}/equipment`}
          className="block mb-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 hover:border-amber-500/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="h-6 w-6 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-200">
                {openDamageReportCount} Open Damage Report{openDamageReportCount !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-amber-300/70">
                Review and resolve equipment damage reports
              </p>
            </div>
            <svg
              className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Announcements Widget */}
      {announcements.length > 0 && (
        <div className="mb-6">
          <AnnouncementList
            teamSlug={teamSlug}
            initialAnnouncements={announcements}
            showEmpty={false}
            isCoach={isCoach}
          />
        </div>
      )}

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Equipment */}
        <Link
          href={`/${teamSlug}/equipment`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-emerald-500/20">
              <svg
                className="h-7 w-7 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <span className="text-3xl font-bold text-[var(--text-primary)]">{equipmentCount}</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Equipment</h3>
          <p className="text-sm text-[var(--text-muted)]">Shells, oars, and launches</p>
        </Link>

        {/* Roster */}
        <Link
          href={`/${teamSlug}/roster`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="h-14 w-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${team.secondaryColor}20` }}
            >
              <svg
                className="h-7 w-7"
                style={{ color: team.secondaryColor }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-[var(--text-primary)]">{memberCount}</span>
              {isCoach && pendingInvitationCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-white text-xs font-medium rounded-full bg-emerald-600">
                  +{pendingInvitationCount}
                </span>
              )}
            </div>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Roster</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {isCoach ? 'Team members & invitations' : 'View team members'}
          </p>
        </Link>

        {/* Settings (Coach Only) */}
        {isCoach && (
          <Link
            href={`/${teamSlug}/settings`}
            className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-14 w-14 rounded-xl bg-[var(--surface-3)] flex items-center justify-center">
                <svg
                  className="h-7 w-7 text-[var(--text-secondary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Settings</h3>
            <p className="text-sm text-[var(--text-muted)]">Team colors & preferences</p>
          </Link>
        )}

        {/* Schedule */}
        <Link
          href={`/${teamSlug}/schedule`}
          className="group bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-xl p-6 transition-all duration-200 border border-[var(--border-subtle)] hover:border-[var(--border)]"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-emerald-500/20">
              <svg
                className="h-7 w-7 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Schedule</h3>
          <p className="text-sm text-[var(--text-muted)]">Practices & regattas</p>
        </Link>

        {/* Lineups - Coming Soon */}
        <div className="bg-[var(--surface-1)]/50 rounded-xl p-6 border border-[var(--border-subtle)]/50 opacity-60">
          <div className="flex items-start justify-between mb-4">
            <div className="h-14 w-14 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
              <svg
                className="h-7 w-7 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-muted)] mb-1">Lineups</h3>
          <p className="text-sm text-[var(--text-muted)]">Coming soon</p>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardWithOnboarding
      teamId={team.id}
      teamName={team.name}
      isCoach={isCoach}
    >
      {dashboardContent}
    </DashboardWithOnboarding>
  );
}
