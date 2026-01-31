import Link from 'next/link';
import { UserForm } from '@/components/admin/users/user-form';

/**
 * Create new user page for admin panel.
 *
 * Renders the UserForm in create mode.
 * After successful creation:
 * - User record created in Supabase Auth
 * - Password setup email sent via Supabase invite
 * - Redirects back to user list
 */
export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to Users
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">Create User</h1>
      </div>

      <div className="max-w-xl">
        <UserForm mode="create" />
      </div>
    </div>
  );
}
