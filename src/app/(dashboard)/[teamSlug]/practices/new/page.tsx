import { redirect } from 'next/navigation';
import { requireTeamBySlug } from '@/lib/auth/authorize';

interface NewPracticePageProps {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ seasonId?: string; date?: string }>;
}

/**
 * Redirect /practices/new to /practices/bulk-create for consistent flow.
 *
 * This maintains backward compatibility for:
 * - Calendar "Add Practice" buttons (link to /practices/new)
 * - Any existing bookmarks or links
 *
 * Query params preserved:
 * - seasonId: Pre-selects the season in bulk-create
 * - date: Sets initial date for single-practice creation (from calendar click)
 */
export default async function NewPracticePage({ params, searchParams }: NewPracticePageProps) {
  const { teamSlug } = await params;
  const { seasonId, date } = await searchParams;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can create practices
  if (!isCoach) {
    redirect(`/${teamSlug}/practices`);
  }

  // Build redirect URL with query params
  const queryParams = new URLSearchParams();
  if (seasonId) {
    queryParams.set('seasonId', seasonId);
  }
  if (date) {
    queryParams.set('date', date);
  }

  const queryString = queryParams.toString();
  const redirectUrl = `/${teamSlug}/practices/bulk-create${queryString ? `?${queryString}` : ''}`;

  redirect(redirectUrl);
}
