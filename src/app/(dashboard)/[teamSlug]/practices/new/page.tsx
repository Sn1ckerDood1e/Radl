import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { PracticeForm } from '@/components/practices/practice-form';

interface NewPracticePageProps {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ seasonId?: string; templateId?: string }>;
}

export default async function NewPracticePage({ params, searchParams }: NewPracticePageProps) {
  const { teamSlug } = await params;
  const { seasonId: seasonIdParam, templateId: templateIdParam } = await searchParams;

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

  // Get active seasons for this team
  const seasons = await prisma.season.findMany({
    where: {
      teamId: team.id,
      status: 'ACTIVE',
    },
    orderBy: { startDate: 'desc' },
  });

  if (seasons.length === 0) {
    // Redirect to practices page with message
    redirect(`/${teamSlug}/practices`);
  }

  // Use provided seasonId or default to first active season
  const selectedSeasonId = seasonIdParam && seasons.some(s => s.id === seasonIdParam)
    ? seasonIdParam
    : seasons[0].id;

  // Get available templates for this team
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
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}/practices`} className="hover:text-emerald-400 transition-colors">
              Practices
            </Link>
          </li>
          <li>/</li>
          <li className="text-white">New Practice</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create Practice</h1>
        <p className="text-zinc-400 mt-1">
          Schedule a new practice for {team.name}.
        </p>
      </div>

      {/* Season selector if multiple seasons */}
      {seasons.length > 1 && (
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <label htmlFor="season-select" className="block text-sm font-medium text-zinc-300 mb-2">
            Season
          </label>
          <SeasonSelector
            seasons={seasons}
            selectedId={selectedSeasonId}
            teamSlug={teamSlug}
          />
        </div>
      )}

      {/* Template selector if templates exist */}
      {templates.length > 0 && (
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Start from template
          </label>
          <p className="text-xs text-zinc-500 mb-3">
            Apply a template to quickly create a practice with a predefined structure
          </p>
          <ApplyTemplateSection
            templates={templates.map(t => ({
              id: t.id,
              name: t.name,
              defaultStartTime: t.defaultStartTime,
              defaultEndTime: t.defaultEndTime,
              blockCount: t.blocks.length,
            }))}
            seasonId={selectedSeasonId}
            teamSlug={teamSlug}
            selectedTemplateId={templateIdParam}
          />
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <PracticeForm teamSlug={teamSlug} seasonId={selectedSeasonId} />
      </div>
    </div>
  );
}

// Client component for season selection
function SeasonSelector({
  seasons,
  selectedId,
  teamSlug,
}: {
  seasons: Array<{ id: string; name: string }>;
  selectedId: string;
  teamSlug: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((season) => (
        <Link
          key={season.id}
          href={`/${teamSlug}/practices/new?seasonId=${season.id}`}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${season.id === selectedId
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'}
          `}
        >
          {season.name}
        </Link>
      ))}
    </div>
  );
}

// Client component for applying templates
import { ApplyTemplateSection } from '@/components/templates/apply-template-section';
