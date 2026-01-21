import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { PracticeDetailClient } from './practice-detail-client';

interface PracticeDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has a team
  const { claims } = await requireTeam();

  if (!claims.team_id) {
    redirect('/create-team');
  }

  // Get team info
  const team = await prisma.team.findUnique({
    where: { id: claims.team_id },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!team || team.slug !== teamSlug) {
    redirect('/create-team');
  }

  const isCoach = claims.user_role === 'COACH';

  // Get practice with blocks
  const practice = await prisma.practice.findFirst({
    where: {
      id,
      teamId: team.id,
    },
    include: {
      blocks: {
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
          })),
          season: practice.season,
        }}
        teamSlug={teamSlug}
        isCoach={isCoach}
      />
    </div>
  );
}
