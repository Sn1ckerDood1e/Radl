import { prisma } from '@/lib/prisma';
import { TeamColorProvider } from '@/components/providers/team-color-provider';

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}

/**
 * Nested layout for team-specific pages.
 * Applies team colors based on URL slug, not JWT claims.
 */
export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { teamSlug } = await params;

  // Get team colors from URL slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { primaryColor: true, secondaryColor: true },
  });

  const teamColors = team
    ? { primaryColor: team.primaryColor, secondaryColor: team.secondaryColor }
    : { primaryColor: '#10b981', secondaryColor: '#6ee7b7' };

  return (
    <TeamColorProvider colors={teamColors}>
      {children}
    </TeamColorProvider>
  );
}
