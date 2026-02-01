import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BulkMembershipForm } from '@/components/admin/memberships/bulk-membership-form';

/**
 * Club data from API.
 */
interface ClubData {
  id: string;
  name: string;
}

interface PageProps {
  params: Promise<{ clubId: string }>;
}

/**
 * Fetch club info from internal API.
 */
async function getClub(clubId: string): Promise<ClubData | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${appUrl}/api/admin/clubs/${clubId}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error('[admin/clubs/[clubId]/members/bulk] API error:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      id: data.club.id,
      name: data.club.name,
    };
  } catch (error) {
    console.error('[admin/clubs/[clubId]/members/bulk] Fetch error:', error);
    return null;
  }
}

/**
 * Bulk membership import page.
 *
 * Allows super admin to add multiple members to a club via CSV upload.
 * Features:
 * - CSV format guide
 * - File upload with drag-and-drop
 * - Preview before submission
 * - Results summary showing added/updated/skipped/failed
 *
 * Requirement: MEMB-05 (Bulk membership import via CSV)
 */
export default async function BulkMembershipPage({ params }: PageProps) {
  const { clubId } = await params;

  const club = await getClub(clubId);

  if (!club) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/clubs/${club.id}`}
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to {club.name}
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
          Bulk Import Members
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Upload a CSV file to add multiple members to {club.name} at once.
          Users must already exist in the system.
        </p>
      </div>

      <div className="max-w-3xl">
        <BulkMembershipForm clubId={club.id} clubName={club.name} />
      </div>
    </div>
  );
}
