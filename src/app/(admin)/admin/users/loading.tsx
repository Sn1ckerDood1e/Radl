import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for admin users page.
 *
 * Shows placeholder elements while user data is being fetched:
 * - Header with title skeleton
 * - Search input skeleton
 * - Table with row skeletons
 * - Pagination skeleton
 */
export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-9 w-80" />

      {/* Table skeleton */}
      <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
        {/* Header row */}
        <div className="bg-[var(--surface-2)] border-b border-[var(--border-subtle)] p-3 flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-8" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--surface-1)] border-b border-[var(--border-subtle)] last:border-0 p-3 flex gap-4 items-center"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
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
