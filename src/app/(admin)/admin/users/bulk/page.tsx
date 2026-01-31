import Link from 'next/link';
import { BulkUploadForm } from '@/components/admin/users/bulk-upload-form';

/**
 * Bulk user upload page for admin panel.
 *
 * Allows super admin to create multiple users via CSV upload.
 * Features:
 * - CSV format guide
 * - File upload with drag-and-drop
 * - Preview before submission
 * - Progress feedback during creation
 * - Results summary showing created/skipped/failed
 *
 * Requirement: USER-09 (Bulk user creation via CSV)
 */
export default function BulkUploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to Users
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">Bulk Create Users</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Upload a CSV file to create multiple users at once. Each user will receive a password setup email.
        </p>
      </div>

      <div className="max-w-3xl">
        <BulkUploadForm />
      </div>
    </div>
  );
}
