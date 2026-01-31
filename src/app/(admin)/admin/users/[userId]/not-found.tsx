import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * 404 page for when a user ID doesn't exist.
 * Shows friendly message and link back to user list.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">User Not Found</h1>
      <p className="text-[var(--text-muted)] mb-6">
        The user you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
      <Link href="/admin/users">
        <Button>Back to Users</Button>
      </Link>
    </div>
  );
}
