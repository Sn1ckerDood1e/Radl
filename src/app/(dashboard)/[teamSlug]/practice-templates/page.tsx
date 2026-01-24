import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { TemplateCard } from '@/components/templates/template-card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

interface PracticeTemplatesPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function PracticeTemplatesPage({ params }: PracticeTemplatesPageProps) {
  const { teamSlug } = await params;

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

  // Get all practice templates for this team
  const templates = await prisma.practiceTemplate.findMany({
    where: {
      teamId: team.id,
    },
    include: {
      blocks: {
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}`} className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li className="text-white">Practice Templates</li>
        </ol>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Templates</h1>
          <p className="text-zinc-400 mt-1">
            Save and reuse practice structures
          </p>
        </div>
        <Link
          href={`/${teamSlug}/practice-templates/new`}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </Link>
      </div>

      {/* Templates list */}
      {templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={{
                id: template.id,
                name: template.name,
                defaultStartTime: template.defaultStartTime,
                defaultEndTime: template.defaultEndTime,
                blocks: template.blocks.map((b) => ({ type: b.type })),
              }}
              teamSlug={teamSlug}
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Create your first template to save practice structures for easy reuse."
            action={{ label: "New Template", href: `/${teamSlug}/practice-templates/new` }}
          />
        </div>
      )}
    </div>
  );
}
