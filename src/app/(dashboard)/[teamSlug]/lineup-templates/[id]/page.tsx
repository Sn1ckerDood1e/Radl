import { prisma } from '@/lib/prisma';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { notFound } from 'next/navigation';
import { LineupTemplateDetailClient } from './lineup-template-detail-client';

interface PageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function LineupTemplateDetailPage({ params }: PageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Fetch template with seats and athletes
  const template = await prisma.lineupTemplate.findUnique({
    where: { id, teamId: team.id },
    include: {
      seats: {
        include: {
          athlete: { select: { id: true, displayName: true, sidePreference: true } },
        },
        orderBy: { position: 'asc' },
      },
      defaultBoat: { select: { id: true, name: true, boatClass: true } },
    },
  });

  if (!template) notFound();

  // Fetch team athletes for editing
  const athletes = await prisma.athleteProfile.findMany({
    where: {
      teamMember: { teamId: team.id },
    },
    select: { id: true, displayName: true, sidePreference: true },
    orderBy: { displayName: 'asc' },
  });

  // Fetch boats matching boat class
  const boats = await prisma.equipment.findMany({
    where: {
      teamId: team.id,
      type: 'SHELL',
      boatClass: template.boatClass,
      status: 'ACTIVE',
    },
    select: { id: true, name: true, boatClass: true },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <LineupTemplateDetailClient
        template={template}
        athletes={athletes}
        boats={boats}
        isCoach={isCoach}
        teamSlug={teamSlug}
      />
    </div>
  );
}
