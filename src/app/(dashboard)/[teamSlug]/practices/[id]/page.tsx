import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { PracticeDetailClient } from './practice-detail-client';

interface PracticeDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Get practice with blocks
  const practice = await prisma.practice.findFirst({
    where: {
      id,
      teamId: team.id,
    },
    include: {
      blocks: {
        include: {
          lineup: {
            take: 1,
            include: {
              seats: {
                include: {
                  athlete: {
                    select: { id: true, displayName: true, sidePreference: true },
                  },
                },
                orderBy: { position: 'asc' },
              },
            },
          },
          landAssignments: {
            include: {
              athlete: {
                select: { id: true, displayName: true },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
      season: {
        select: { id: true, name: true },
      },
    },
  });

  if (!practice) {
    notFound();
  }

  // Athletes can only view PUBLISHED practices
  if (!isCoach && practice.status !== 'PUBLISHED') {
    notFound();
  }

  // Fetch additional data for lineup editor (coaches only)
  const athletes = isCoach
    ? await prisma.athleteProfile.findMany({
        where: {
          teamMember: { teamId: team.id },
        },
        select: { id: true, displayName: true, sidePreference: true },
        orderBy: { displayName: 'asc' },
      })
    : [];

  const boats = isCoach
    ? await prisma.equipment.findMany({
        where: {
          teamId: team.id,
          type: 'SHELL',
          status: 'ACTIVE',
        },
        include: {
          damageReports: {
            where: { status: 'OPEN' },
          },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  // ERG count - for now, we don't track individual ergs in equipment
  // This would be a team setting or hardcoded based on facility
  const ergCount = 20; // Default erg capacity

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}/practices`} className="hover:text-emerald-400 transition-colors">
              Practices
            </Link>
          </li>
          <li>/</li>
          <li className="text-white truncate max-w-[200px]">{practice.name}</li>
        </ol>
      </nav>

      <PracticeDetailClient
        practice={{
          id: practice.id,
          name: practice.name,
          date: practice.date.toISOString(),
          startTime: practice.startTime.toISOString(),
          endTime: practice.endTime.toISOString(),
          notes: practice.notes,
          status: practice.status,
          blocks: practice.blocks.map(b => ({
            id: b.id,
            type: b.type,
            position: b.position,
            durationMinutes: b.durationMinutes,
            category: b.category,
            notes: b.notes,
            lineup: b.lineup.length > 0 ? {
              id: b.lineup[0].id,
              boatId: b.lineup[0].boatId,
              seats: b.lineup[0].seats.map(s => ({
                position: s.position,
                side: s.side,
                athleteId: s.athleteId,
                athlete: s.athlete,
              })),
            } : null,
            landAssignments: b.landAssignments.map(a => ({
              athleteId: a.athleteId,
              athlete: a.athlete,
            })),
          })),
          season: practice.season,
        }}
        teamSlug={teamSlug}
        isCoach={isCoach}
        athletes={athletes.map(a => ({
          id: a.id,
          displayName: a.displayName,
          sidePreference: a.sidePreference,
        }))}
        boats={boats.map(b => ({
          id: b.id,
          name: b.name,
          boatClass: b.boatClass,
          available: !b.manualUnavailable && b.damageReports.length === 0,
        }))}
        ergCount={ergCount}
      />
    </div>
  );
}
