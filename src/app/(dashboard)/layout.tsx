import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { TeamColorProvider } from '@/components/providers/team-color-provider';
import { PWAWrapper } from '@/components/pwa/pwa-wrapper';
import { Toaster } from 'sonner';
import { AbilityProvider } from '@/components/permissions/ability-provider';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import type { UserContext } from '@/lib/permissions/ability';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';

/**
 * Dashboard layout with CASL AbilityProvider integration.
 *
 * Every dashboard page gets permissions via context.
 * Header shows unified context switcher.
 * Invalid/missing context redirects to onboarding.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get validated claims with viewMode
  const { user, facilityId, clubId, roles, viewMode, error } = await getClaimsForApiRoute();

  if (error || !user) {
    redirect('/login');
  }

  // Check if user has valid context (club or facility membership)
  if (!clubId && !facilityId) {
    // No memberships - redirect to onboarding/club selection
    redirect('/onboarding');
  }

  // Construct UserContext for AbilityProvider
  const userContext: UserContext = {
    userId: user.id,
    facilityId: facilityId ?? undefined,
    clubId: clubId ?? '',  // Empty string for facility-only view
    roles: roles as UserContext['roles'],
    viewMode: viewMode ?? 'club',  // Default to club for legacy
  };

  // Get team colors from current club
  let teamColors = { primaryColor: '#10b981', secondaryColor: '#6ee7b7' };
  if (clubId) {
    const team = await prisma.team.findUnique({
      where: { id: clubId },
      select: { primaryColor: true, secondaryColor: true },
    });
    if (team) {
      teamColors = { primaryColor: team.primaryColor, secondaryColor: team.secondaryColor };
    }
  }

  // Build contexts for header SSR
  const facilityMemberships = await prisma.facilityMembership.findMany({
    where: { userId: user.id, isActive: true },
    include: { facility: { select: { id: true, name: true, slug: true } } },
  });
  const clubMemberships = await prisma.clubMembership.findMany({
    where: { userId: user.id, isActive: true },
    include: { club: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, facilityId: true } } },
  });

  // Build available contexts for context switcher
  const facilityMembership = facilityMemberships[0];
  const isFacilityAdmin = facilityMembership?.roles.includes('FACILITY_ADMIN') ?? false;

  // If no ClubMembership records, fall back to TeamMember for legacy support
  let clubsForSwitcher: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
    roles: string[];
  }> = clubMemberships.map(m => ({
    id: m.club.id,
    name: m.club.name,
    slug: m.club.slug,
    logoUrl: m.club.logoUrl,
    primaryColor: m.club.primaryColor,
    roles: m.roles as string[],
  }));

  // Legacy fallback: if no ClubMembership, check TeamMember
  if (clubsForSwitcher.length === 0 && clubId) {
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: { team: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } } },
    });
    clubsForSwitcher = teamMemberships.map(m => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      logoUrl: m.team.logoUrl,
      primaryColor: m.team.primaryColor,
      roles: [m.role] as string[],  // TeamMember has singular role
    }));
  }

  const contexts = {
    facility: facilityMembership ? {
      id: facilityMembership.facility.id,
      name: facilityMembership.facility.name,
      slug: facilityMembership.facility.slug,
      isFacilityAdmin,
    } : undefined,
    clubs: clubsForSwitcher,
    currentContext: {
      viewMode,
      facilityId,
      clubId,
    },
  };

  // Legacy team object for backward compatibility
  const legacyTeam = clubId ? await prisma.team.findUnique({
    where: { id: clubId },
    select: { slug: true, name: true, logoUrl: true, primaryColor: true, secondaryColor: true },
  }) : null;

  return (
    <AbilityProvider user={userContext}>
      <TeamColorProvider colors={teamColors}>
        <PWAWrapper>
          <CommandPaletteProvider />
          <div className="min-h-screen bg-[var(--background)] transition-colors">
            <DashboardHeader team={legacyTeam} contexts={contexts} />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster position="bottom-right" richColors closeButton theme="dark" />
          </div>
        </PWAWrapper>
      </TeamColorProvider>
    </AbilityProvider>
  );
}
