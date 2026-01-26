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

  // Get team info and data in parallel
  const announcementsWhere = buildActiveAnnouncementsQuery(teamId);
  const now = new Date();
  const [team, openDamageReportCount, announcementsRaw, upcomingPractices] = await Promise.all([
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
    prisma.practice.findMany({
      where: {
        teamId: teamId,
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
      take: 5,
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
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

      {/* Announcements Widget - Always show for coaches, show for athletes if there are announcements */}
      {(isCoach || announcements.length > 0) && (
        <div className="mb-6">
          <AnnouncementList
            teamSlug={teamSlug}
            initialAnnouncements={announcements}
            showEmpty={isCoach}
            isCoach={isCoach}
          />
        </div>
      )}

      {/* Upcoming Practices */}
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upcoming Practices</h2>
          <Link
            href={`/${teamSlug}/practices`}
            className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
          >
            View all
          </Link>
        </div>
        {upcomingPractices.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {upcomingPractices.map((practice) => {
              const practiceDate = new Date(practice.date);
              const isToday = practiceDate.toDateString() === now.toDateString();
              const isTomorrow = practiceDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

              return (
                <Link
                  key={practice.id}
                  href={`/${teamSlug}/practices/${practice.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    {isToday ? (
                      <span className="text-sm font-bold text-emerald-500">Today</span>
                    ) : isTomorrow ? (
                      <span className="text-sm font-bold text-blue-400">Tomorrow</span>
                    ) : (
                      <>
                        <div className="text-xs text-[var(--text-muted)] uppercase">
                          {practiceDate.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold text-[var(--text-primary)]">
                          {practiceDate.getDate()}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--text-primary)] truncate">
                      {practice.name || 'Practice'}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      {practice.startTime && practice.endTime
                        ? `${practice.startTime} - ${practice.endTime}`
                        : practiceDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[var(--text-muted)] mb-4">No upcoming practices scheduled</p>
            {isCoach && (
              <Link
                href={`/${teamSlug}/practices/new`}
                className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 font-medium"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create a practice
              </Link>
            )}
          </div>
        )}
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
