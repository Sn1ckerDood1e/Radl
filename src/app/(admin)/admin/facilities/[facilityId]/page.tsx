import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Pencil, MapPin, Users, Building2, Package, Calendar, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Club info for facility detail page.
 */
interface ClubInfo {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
}

/**
 * Facility detail response from API.
 */
interface FacilityDetail {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    clubCount: number;
    memberCount: number;
    equipmentCount: number;
  };
  clubs: ClubInfo[];
}

interface FacilityResponse {
  facility: FacilityDetail;
}

interface PageProps {
  params: Promise<{ facilityId: string }>;
}

/**
 * Fetch facility detail from internal API with server-side cookies forwarded.
 */
async function getFacility(facilityId: string): Promise<FacilityDetail | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${appUrl}/api/admin/facilities/${facilityId}`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error('[admin/facilities/[facilityId]] API error:', response.status);
      return null;
    }

    const data: FacilityResponse = await response.json();
    return data.facility;
  } catch (error) {
    console.error('[admin/facilities/[facilityId]] Fetch error:', error);
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
 * Format short date for table display.
 */
function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format location string from city and state.
 */
function formatLocation(facility: FacilityDetail): string | null {
  const parts = [facility.city, facility.state, facility.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Admin facility detail page.
 *
 * Displays full facility information including:
 * - Facility name and location
 * - Stats (clubs, members, equipment, created date)
 * - Contact information (phone, email, website)
 * - Nested clubs with member counts
 *
 * Super admin only (enforced by admin layout).
 */
export default async function AdminFacilityDetailPage({ params }: PageProps) {
  const { facilityId } = await params;

  const facility = await getFacility(facilityId);

  if (!facility) {
    notFound();
  }

  const location = formatLocation(facility);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/admin/facilities" className="hover:text-[var(--text-primary)]">
          Facilities
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-[var(--text-primary)]">{facility.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {facility.name}
          </h1>
          {location && (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
        </div>
        <Link href={`/admin/facilities/${facility.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4" />
            Edit Facility
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">Clubs</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {facility.stats.clubCount}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Members</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {facility.stats.memberCount}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Package className="h-4 w-4" />
            <span className="text-sm">Equipment</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {facility.stats.equipmentCount}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Created</span>
          </div>
          <p className="text-lg font-medium text-[var(--text-primary)]">
            {formatShortDate(facility.createdAt)}
          </p>
        </div>
      </div>

      {/* Contact info section (if any contact info exists) */}
      {(facility.phone || facility.email || facility.website) && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Contact Information
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {facility.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Phone</p>
                    <p className="text-[var(--text-primary)]">{facility.phone}</p>
                  </div>
                </div>
              )}
              {facility.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Email</p>
                    <a
                      href={`mailto:${facility.email}`}
                      className="text-[var(--text-primary)] hover:underline"
                    >
                      {facility.email}
                    </a>
                  </div>
                </div>
              )}
              {facility.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Website</p>
                    <a
                      href={facility.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-primary)] hover:underline"
                    >
                      {facility.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description (if exists) */}
      {facility.description && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <p className="text-sm text-[var(--text-muted)] mb-2">Description</p>
          <p className="text-[var(--text-primary)]">{facility.description}</p>
        </div>
      )}

      {/* Clubs section */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Clubs ({facility.clubs.length})
          </h2>
          <Link href={`/admin/clubs/new?facilityId=${facility.id}`}>
            <Button variant="outline" size="sm">
              Create Club
            </Button>
          </Link>
        </div>
        {facility.clubs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-muted)]">No clubs in this facility yet.</p>
            <Link
              href={`/admin/clubs/new?facilityId=${facility.id}`}
              className="text-teal-500 hover:underline text-sm mt-2 inline-block"
            >
              Create the first club
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
                  Name
                </th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
                  Members
                </th>
                <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {facility.clubs.map((club) => (
                <tr
                  key={club.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-2)]/50"
                >
                  <td className="p-3">
                    <Link
                      href={`/admin/clubs/${club.id}`}
                      className="text-sm font-medium text-[var(--text-primary)] hover:underline"
                    >
                      {club.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-[var(--text-secondary)]">
                    {club.memberCount}
                  </td>
                  <td className="p-3 text-sm text-[var(--text-muted)]">
                    {formatShortDate(club.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
