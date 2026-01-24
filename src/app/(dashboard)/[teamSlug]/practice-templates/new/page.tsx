import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { TemplateForm } from '@/components/templates/template-form';

interface NewTemplatePageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function NewTemplatePage({ params }: NewTemplatePageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can create templates
  if (!isCoach) {
    redirect(`/${teamSlug}`);
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
