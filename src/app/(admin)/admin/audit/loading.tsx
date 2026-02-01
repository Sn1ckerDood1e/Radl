import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for admin audit log page.
 *
 * Shows placeholder elements while audit data is being fetched:
 * - Header with title skeleton
 * - Filter bar skeleton
 * - Table with row skeletons
 * - Pagination skeleton
 */
export default function AdminAuditLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-[250px]" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
        {/* Header row */}
        <div className="bg-[var(--surface-2)] border-b border-[var(--border-subtle)] p-3 flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface-1)] border-b border-[var(--border-subtle)] last:border-0 p-3 flex gap-4 items-center"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
