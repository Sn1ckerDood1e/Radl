import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { UserForm } from '@/components/admin/users/user-form';

interface Props {
  params: Promise<{ userId: string }>;
}

/**
 * Edit user page for admin panel.
 *
 * Fetches existing user data and renders UserForm in edit mode.
 * Email field is disabled (Supabase limitation).
 *
 * After successful update:
 * - User metadata updated in Supabase Auth
 * - Redirects back to user list
 */
export default async function EditUserPage({ params }: Props) {
  const { userId } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/users/${userId}`,
    {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    }
  );

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }

  const data = await res.json();
  const user = data.user;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/users/${userId}`}
          className="text-sm text-[var(--text-muted)] hover:underline"
        >
          &larr; Back to User Details
        </Link>
        <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">Edit User</h1>
      </div>

      <div className="max-w-xl">
        <UserForm
          mode="edit"
          userId={userId}
          defaultValues={{
            email: user.email,
            displayName: user.displayName || '',
            phone: user.phone || '',
          }}
        />
      </div>
    </div>
  );
}
