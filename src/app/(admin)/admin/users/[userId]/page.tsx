import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserDetailCard } from '@/components/admin/users/user-detail-card';
import { MembershipList } from '@/components/admin/users/membership-list';

interface Props {
  params: Promise<{ userId: string }>;
}

/**
 * User detail page for admin panel.
 *
 * Shows:
 * - User profile information (via UserDetailCard)
 * - All facility and club memberships (via MembershipList)
 * - Link to edit the user
 *
 * Data fetched server-side with cookie forwarding for auth.
 */
export default async function UserDetailPage({ params }: Props) {
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/users" className="text-sm text-[var(--text-muted)] hover:underline">
            &larr; Back to Users
          </Link>
          <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">User Details</h1>
        </div>
        <div className="space-x-2">
          <Link href={`/admin/users/${userId}/edit`}>
            <Button variant="outline">Edit User</Button>
          </Link>
        </div>
      </div>

      <UserDetailCard user={user} />

      <div>
        <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
          Club Memberships ({user.clubs?.length ?? 0})
        </h2>
        <MembershipList memberships={user.clubs ?? []} />
      </div>

      {user.facilities && user.facilities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Facility Memberships ({user.facilities.length})
          </h2>
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Facility</th>
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Roles</th>
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Joined</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface-1)]">
                {user.facilities.map((facility: { id: string; name: string; roles: string[]; joinedAt: string }) => (
                  <tr key={facility.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="p-3 text-sm font-medium text-[var(--text-primary)]">{facility.name}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {facility.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-[var(--text-muted)]">
                      {new Date(facility.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
