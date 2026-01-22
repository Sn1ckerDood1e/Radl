import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserClaims } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { TeamColorProvider } from '@/components/providers/team-color-provider';
import { PWAWrapper } from '@/components/pwa/pwa-wrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // Get team info for header
  let claims = await getUserClaims();
  let team: { slug: string; name: string; logoUrl: string | null; primaryColor: string; secondaryColor: string } | null = null;

  // Fallback to database if JWT claims missing
  if (!claims?.team_id) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
      include: { team: true },
    });
    if (teamMember) {
      team = {
        slug: teamMember.team.slug,
        name: teamMember.team.name,
        logoUrl: teamMember.team.logoUrl,
        primaryColor: teamMember.team.primaryColor,
        secondaryColor: teamMember.team.secondaryColor,
      };
    }
  } else {
    const foundTeam = await prisma.team.findUnique({
      where: { id: claims.team_id },
      select: { slug: true, name: true, logoUrl: true, primaryColor: true, secondaryColor: true },
    });
    team = foundTeam;
  }

  const teamColors = team
    ? { primaryColor: team.primaryColor, secondaryColor: team.secondaryColor }
    : { primaryColor: '#10b981', secondaryColor: '#6ee7b7' };

  return (
    <TeamColorProvider colors={teamColors}>
      <PWAWrapper>
        <div className="min-h-screen bg-[var(--background)] transition-colors">
          <DashboardHeader team={team} />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </PWAWrapper>
    </TeamColorProvider>
  );
}
