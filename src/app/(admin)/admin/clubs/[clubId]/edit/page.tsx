import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ClubEditClient } from './club-edit-client';

/**
 * Club detail response from API.
 */
interface ClubDetail {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  joinCode: string;
  facilityId: string | null;
  facility: {
    id: string;
    name: string;
    slug: string;
  } | null;
  settings: {
    id: string;
    damageNotifyUserIds: string[];
    readinessInspectSoonDays: number;
    readinessNeedsAttentionDays: number;
    readinessOutOfServiceDays: number;
  } | null;
  memberCount: number;
  equipmentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ClubResponse {
  club: ClubDetail;
}

interface Facility {
  id: string;
  name: string;
}

interface FacilitiesResponse {
  facilities: Facility[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

interface PageProps {
  params: Promise<{ clubId: string }>;
}

/**
 * Fetch club detail from internal API with server-side cookies forwarded.
 */
async function getClub(clubId: string): Promise<ClubDetail | null> {
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
      console.error('[admin/clubs/[clubId]/edit] API error:', response.status);
      return null;
    }

    const data: ClubResponse = await response.json();
    return data.club;
  } catch (error) {
    console.error('[admin/clubs/[clubId]/edit] Fetch error:', error);
    return null;
  }
}

/**
 * Fetch all facilities for the move dialog.
 */
async function getFacilities(): Promise<Facility[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${appUrl}/api/admin/facilities?perPage=100`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[admin/clubs/[clubId]/edit] Failed to fetch facilities:', response.status);
      return [];
    }

    const data: FacilitiesResponse = await response.json();
    return data.facilities.map((f) => ({
      id: f.id,
      name: f.name,
    }));
  } catch (error) {
    console.error('[admin/clubs/[clubId]/edit] Fetch error:', error);
    return [];
  }
}

/**
 * Edit club page for admin panel.
 *
 * Fetches existing club data and renders:
 * - ClubForm in edit mode
 * - Danger zone with Move and Delete actions
 *
 * After successful update:
 * - Club metadata updated
 * - Redirects back to club list
 */
export default async function EditClubPage({ params }: PageProps) {
  const { clubId } = await params;

  // Fetch club and facilities in parallel
  const [club, facilities] = await Promise.all([
    getClub(clubId),
    getFacilities(),
  ]);

  if (!club) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin/clubs" className="hover:text-[var(--text-primary)]">
          Clubs
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/admin/clubs/${club.id}`}
          className="hover:text-[var(--text-primary)]"
        >
          {club.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-[var(--text-primary)]">Edit</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Edit Club
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Update club details or manage dangerous operations.
        </p>
      </div>

      {/* Client wrapper for forms and dialogs */}
      <ClubEditClient
        club={club}
        facilities={facilities}
      />
    </div>
  );
}
