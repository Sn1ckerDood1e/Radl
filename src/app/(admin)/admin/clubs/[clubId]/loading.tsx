import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for admin club detail page.
 *
 * Shows placeholder elements matching the detail page layout:
 * - Breadcrumb skeleton
 * - Header with title and edit button
 * - Stats row (3 cards)
 * - Info section
 * - Settings section
 */
export default function AdminClubDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Info section skeleton */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
            <div>
              <Skeleton className="h-4 w-12 mb-2" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Settings section skeleton */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="p-4 space-y-4">
          <div>
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-48 mb-2" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded bg-[var(--surface-2)] p-3">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
