import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { TemplateDetailClient } from './template-detail-client';

interface TemplateDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user is a coach
  const { claims } = await requireRole(['COACH']);

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

  // Fetch template with blocks
  const template = await prisma.practiceTemplate.findFirst({
    where: {
      id,
      teamId: team.id,
    },
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}/practice-templates`} className="hover:text-emerald-400 transition-colors">
              Practice Templates
            </Link>
          </li>
          <li>/</li>
          <li className="text-white">{template.name}</li>
        </ol>
      </nav>

      <TemplateDetailClient
        template={{
          id: template.id,
          name: template.name,
          defaultStartTime: template.defaultStartTime,
          defaultEndTime: template.defaultEndTime,
          blocks: template.blocks.map((b) => ({
            id: b.id,
            type: b.type,
            position: b.position,
            durationMinutes: b.durationMinutes,
            category: b.category,
            notes: b.notes,
          })),
        }}
        teamSlug={teamSlug}
      />
    </div>
  );
}
