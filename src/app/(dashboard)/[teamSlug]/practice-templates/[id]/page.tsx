import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { TemplateDetailClient } from './template-detail-client';

interface TemplateDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can view practice templates
  if (!isCoach) {
    redirect(`/${teamSlug}`);
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
