import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Pencil, Building2, Users, Package, Calendar, Hash, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClubDetailClient } from './club-detail-client';

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
      console.error('[admin/clubs/[clubId]] API error:', response.status);
      return null;
    }

    const data: ClubResponse = await response.json();
    return data.club;
  } catch (error) {
    console.error('[admin/clubs/[clubId]] Fetch error:', error);
    return null;
  }
}

/**
 * Format date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Admin club detail page.
 *
 * Displays full club information including:
 * - Club name and facility association
 * - Stats (members, equipment, created date)
 * - Join code and slug
 * - Settings (damage notifications, readiness thresholds)
 *
 * Super admin only (enforced by admin layout).
 */
export default async function AdminClubDetailPage({ params }: PageProps) {
  const { clubId } = await params;

  const club = await getClub(clubId);

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
        <span className="text-[var(--text-primary)]">{club.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {club.name}
            </h1>
            {club.facility && (
              <Link href={`/admin/facilities/${club.facility.id}`}>
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {club.facility.name}
                </Badge>
              </Link>
            )}
          </div>
          <p className="text-[var(--text-muted)]">
            Created {formatDate(club.createdAt)}
          </p>
        </div>
        <Link href={`/admin/clubs/${club.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4" />
            Edit Club
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Members</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {club.memberCount}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Package className="h-4 w-4" />
            <span className="text-sm">Equipment</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {club.equipmentCount}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Created</span>
          </div>
          <p className="text-lg font-medium text-[var(--text-primary)]">
            {formatDate(club.createdAt)}
          </p>
        </div>
      </div>

      {/* Info section */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Club Information
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                <Hash className="h-4 w-4" />
                <span className="text-sm">Join Code</span>
              </div>
              <code className="text-lg bg-[var(--surface-2)] px-3 py-1.5 rounded font-mono text-[var(--text-primary)]">
                {club.joinCode}
              </code>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Members use this code to join the club
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                <LinkIcon className="h-4 w-4" />
                <span className="text-sm">Slug</span>
              </div>
              <code className="text-lg bg-[var(--surface-2)] px-3 py-1.5 rounded font-mono text-[var(--text-primary)]">
                {club.slug}
              </code>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                URL-friendly identifier
              </p>
            </div>
          </div>
          {club.primaryColor && (
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">Club Colors</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border border-[var(--border-subtle)]"
                  style={{ backgroundColor: club.primaryColor }}
                  title={`Primary: ${club.primaryColor}`}
                />
                <span className="text-xs text-[var(--text-muted)]">Primary</span>
                {club.secondaryColor && (
                  <>
                    <div
                      className="w-8 h-8 rounded border border-[var(--border-subtle)] ml-4"
                      style={{ backgroundColor: club.secondaryColor }}
                      title={`Secondary: ${club.secondaryColor}`}
                    />
                    <span className="text-xs text-[var(--text-muted)]">Secondary</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings section */}
      {club.settings && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Settings
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-1">
                Damage Notification Recipients
              </p>
              <p className="text-[var(--text-primary)]">
                {club.settings.damageNotifyUserIds.length > 0
                  ? `${club.settings.damageNotifyUserIds.length} user(s) configured`
                  : 'No users configured'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">
                Equipment Readiness Thresholds
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="rounded bg-[var(--surface-2)] p-3">
                  <p className="text-[var(--text-muted)]">Inspect Soon</p>
                  <p className="text-[var(--text-primary)] font-medium">
                    {club.settings.readinessInspectSoonDays} days
                  </p>
                </div>
                <div className="rounded bg-[var(--surface-2)] p-3">
                  <p className="text-[var(--text-muted)]">Needs Attention</p>
                  <p className="text-[var(--text-primary)] font-medium">
                    {club.settings.readinessNeedsAttentionDays} days
                  </p>
                </div>
                <div className="rounded bg-[var(--surface-2)] p-3">
                  <p className="text-[var(--text-muted)]">Out of Service</p>
                  <p className="text-[var(--text-primary)] font-medium">
                    {club.settings.readinessOutOfServiceDays} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members section */}
      <ClubDetailClient clubId={club.id} clubName={club.name} />
    </div>
  );
}
