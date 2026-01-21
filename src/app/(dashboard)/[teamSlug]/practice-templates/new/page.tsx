import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { TemplateForm } from '@/components/templates/template-form';

interface NewTemplatePageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function NewTemplatePage({ params }: NewTemplatePageProps) {
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
          <li className="text-white">New Template</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create Template</h1>
        <p className="text-zinc-400 mt-1">
          Save a reusable practice structure.
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <TemplateForm teamSlug={teamSlug} />
      </div>
    </div>
  );
}
