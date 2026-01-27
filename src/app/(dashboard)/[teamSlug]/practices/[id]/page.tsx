import { notFound } from 'next/navigation';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { InlinePracticePage } from './inline-practice-page';

interface PracticeDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Fetch practice with blocks, lineups, and workouts
  const practice = await prisma.practice.findFirst({
    where: {
      id,
      teamId: team.id,
    },
    include: {
      season: { select: { id: true, name: true } },
      blocks: {
        orderBy: { position: 'asc' },
        include: {
          // For WATER blocks: fetch all lineups (multiple boats)
          lineup: {
            include: {
              boat: true,
              seats: {
                orderBy: { position: 'asc' },
                include: {
                  athlete: {
                    select: { id: true, displayName: true, sidePreference: true },
                  },
                },
              },
            },
          },
          // For ERG blocks: fetch workout
          workout: {
            include: {
              intervals: { orderBy: { position: 'asc' } },
            },
          },
          // For LAND/ERG blocks: fetch assignments
          landAssignments: {
            include: {
              athlete: {
                select: { id: true, displayName: true },
              },
            },
          },
        },
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

  // Fetch athletes and boats for lineup building
  const [athletes, boats] = await Promise.all([
    prisma.athleteProfile.findMany({
      where: {
        teamMember: { teamId: team.id },
      },
      select: {
        id: true,
        displayName: true,
        sidePreference: true,
      },
      orderBy: { displayName: 'asc' },
    }),
    prisma.equipment.findMany({
      where: {
        teamId: team.id,
        type: 'SHELL',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        boatClass: true,
        manualUnavailable: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Transform practice for client component
  const transformedPractice = {
    id: practice.id,
    name: practice.name,
    date: practice.date.toISOString(),
    startTime: practice.startTime.toISOString(),
    endTime: practice.endTime.toISOString(),
    notes: practice.notes,
    status: practice.status as 'DRAFT' | 'PUBLISHED',
    season: practice.season,
    blocks: practice.blocks.map(block => {
      // Transform lineups for water blocks
      // Current schema supports multiple lineups per block
      const lineups = block.lineup.map(lineup => ({
        id: lineup.id,
        boatId: lineup.boatId,
        seats: lineup.seats.map(seat => ({
          position: seat.position,
          label: `Seat ${seat.position}`,
          side: seat.side as 'PORT' | 'STARBOARD' | 'NONE',
          athleteId: seat.athleteId,
        })),
      }));

      return {
        id: block.id,
        type: block.type as 'WATER' | 'ERG' | 'LAND' | 'MEETING',
        title: block.title,
        notes: block.notes,
        durationMinutes: block.durationMinutes,
        category: block.category,
        lineups,
        workout: block.workout ? {
          id: block.workout.id,
          type: block.workout.type,
          notes: block.workout.notes,
          visibleToAthletes: block.workout.visibleToAthletes,
          intervals: block.workout.intervals.map(interval => ({
            id: interval.id,
            position: interval.position,
            durationType: interval.durationType,
            duration: interval.duration,
            targetSplit: interval.targetSplit,
            targetStrokeRate: interval.targetStrokeRate,
            restDuration: interval.restDuration,
            restType: interval.restType,
          })),
        } : null,
      };
    }),
  };

  // Transform boats
  const transformedBoats = boats.map(boat => ({
    id: boat.id,
    name: boat.name,
    boatClass: boat.boatClass,
    available: !boat.manualUnavailable,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <InlinePracticePage
        practice={transformedPractice}
        teamSlug={teamSlug}
        isCoach={isCoach}
        athletes={athletes}
        boats={transformedBoats}
      />
    </div>
  );
}
