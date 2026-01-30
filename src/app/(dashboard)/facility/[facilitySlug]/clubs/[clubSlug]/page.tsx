import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Ship, Calendar, ExternalLink, Settings } from 'lucide-react';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { SubscriptionOverview } from '@/components/facility/subscription-overview';

interface ClubDetailPageProps {
  params: Promise<{ facilitySlug: string; clubSlug: string }>;
}

export default async function FacilityClubDetailPage({ params }: ClubDetailPageProps) {
  const { facilitySlug, clubSlug } = await params;

  // Auth checks
  const { user, viewMode, error } = await getClaimsForApiRoute();
  if (error || !user) redirect('/login');
  if (viewMode !== 'facility') redirect('/');

  // Get facility and verify admin
  const facility = await prisma.facility.findUnique({
    where: { slug: facilitySlug },
    select: { id: true, name: true, billingType: true },
  });
  if (!facility) redirect('/');

  const membership = await prisma.facilityMembership.findFirst({
    where: {
      facilityId: facility.id,
      userId: user.id,
      isActive: true,
      roles: { has: 'FACILITY_ADMIN' },
    },
  });
  if (!membership) redirect('/');

  // Get club with stats
  const club = await prisma.team.findFirst({
    where: {
      slug: clubSlug,
      facilityId: facility.id,
    },
    include: {
      _count: {
        select: {
          members: true,
          equipment: { where: { status: 'ACTIVE' } },
          practices: true,
        },
      },
    },
  });

  if (!club) redirect(`/facility/${facilitySlug}/clubs`);

  // Get recent practices
  const recentPractices = await prisma.practice.findMany({
    where: { teamId: club.id },
    select: {
      id: true,
      name: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
    },
    orderBy: { date: 'desc' },
    take: 5,
  });

  // Get club admins
  const clubAdmins = await prisma.clubMembership.findMany({
    where: {
      clubId: club.id,
      isActive: true,
      roles: { hasSome: ['CLUB_ADMIN', 'COACH'] },
    },
    take: 5,
  });

  // For admins, get their profiles via TeamMember
  const adminUserIds = clubAdmins.map(a => a.userId);
  const adminProfiles = await prisma.teamMember.findMany({
    where: {
      teamId: club.id,
      userId: { in: adminUserIds },
    },
    include: {
      athleteProfile: {
        select: { displayName: true },
      },
    },
  });

  const adminNames = adminProfiles.map(p => p.athleteProfile?.displayName || 'Unknown');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/facility/${facilitySlug}/clubs`}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: club.primaryColor || '#059669' }}
              >
                {club.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{club.name}</h1>
              <p className="text-[var(--text-muted)]">/{club.slug}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${club.slug}`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Club Dashboard
          </Link>
          <Link
            href={`/${club.slug}/settings`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Club Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-muted)]">Members</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{club._count.members}</p>
            </div>
            <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2">
                <Ship className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-muted)]">Equipment</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{club._count.equipment}</p>
            </div>
            <div className="bg-[var(--surface-1)] rounded-xl p-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-muted)]">Practices</span>
              </div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{club._count.practices}</p>
            </div>
          </div>

          {/* Club Admins */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-medium text-[var(--text-primary)]">Club Admins & Coaches</h3>
            </div>
            <div className="p-4">
              {adminNames.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No admins found</p>
              ) : (
                <ul className="space-y-2">
                  {adminNames.map((name, i) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)]">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Practices */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="font-medium text-[var(--text-primary)]">Recent Practices</h3>
              <Link
                href={`/${club.slug}/schedule`}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentPractices.length === 0 ? (
                <div className="p-4 text-sm text-[var(--text-muted)]">No practices scheduled</div>
              ) : (
                recentPractices.map((practice) => (
                  <div key={practice.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{practice.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {new Date(practice.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      practice.status === 'PUBLISHED'
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'bg-zinc-500/20 text-zinc-400'
                    }`}>
                      {practice.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription Overview */}
          <SubscriptionOverview
            clubName={club.name}
            memberCount={club._count.members}
            equipmentCount={club._count.equipment}
            practiceCount={club._count.practices}
            billingType={facility.billingType}
          />

          {/* Club Info */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
            <div className="p-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-medium text-[var(--text-primary)]">Club Info</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Created</span>
                <span className="text-[var(--text-secondary)]">
                  {new Date(club.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Join Code</span>
                <code className="text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
                  {club.joinCode}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Primary Color</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: club.primaryColor }}
                  />
                  <span className="text-[var(--text-secondary)]">{club.primaryColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
