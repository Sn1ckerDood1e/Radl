import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { UserDetailClient } from './user-detail-client';

interface Props {
  params: Promise<{ userId: string }>;
}

/**
 * User detail page for admin panel.
 *
 * Server component that fetches user data and passes to client component.
 * Client component manages dialog state for membership actions.
 *
 * Shows:
 * - User profile information (via UserDetailCard)
 * - All facility and club memberships (via MembershipList)
 * - Actions: Edit user, Add to Club, Edit Roles, Remove from Club
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

  return <UserDetailClient user={data.user} />;
}
