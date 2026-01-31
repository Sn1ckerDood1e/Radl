import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * 404 page for when a facility ID doesn't exist.
 * Shows friendly message and link back to facility list.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Facility Not Found</h1>
      <p className="text-[var(--text-muted)] mb-6">
        The facility you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
      <Link href="/admin/facilities">
        <Button>Back to Facilities</Button>
      </Link>
    </div>
  );
}
