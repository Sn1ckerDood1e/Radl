import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Not found page for club detail.
 *
 * Shown when a club ID doesn't exist or is invalid.
 */
export default function ClubNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Building2 className="h-16 w-16 text-[var(--text-muted)] mb-4" />
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Club Not Found
      </h1>
      <p className="text-[var(--text-muted)] mb-6">
        The club you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
      <Link href="/admin/clubs">
        <Button variant="outline">
          Back to Clubs
        </Button>
      </Link>
    </div>
  );
}
