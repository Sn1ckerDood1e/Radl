import { redirect } from 'next/navigation';

interface SchedulePageProps {
  params: Promise<{ teamSlug: string }>;
}

/**
 * Redirect /schedule to /practices?view=calendar.
 *
 * GAP-02: Consolidate schedule and practices pages into single unified page.
 * This preserves backward compatibility for existing bookmarks/links.
 */
export default async function SchedulePage({ params }: SchedulePageProps) {
  const { teamSlug } = await params;
  redirect(`/${teamSlug}/practices?view=calendar`);
}
