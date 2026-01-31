import Link from 'next/link';
import { FacilityForm } from '@/components/admin/facilities/facility-form';

/**
 * Create new facility page for admin panel.
 *
 * Renders the FacilityForm in create mode.
 * After successful creation:
 * - Facility record created in database
 * - Redirects back to facility list
 *
 * Slug is auto-generated from name if left empty.
 */
export default function NewFacilityPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/facilities"
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to Facilities
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">
          Create Facility
        </h1>
      </div>

      <div className="max-w-2xl">
        <FacilityForm mode="create" />
      </div>
    </div>
  );
}
