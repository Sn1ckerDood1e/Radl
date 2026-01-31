import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading state for user detail page.
 * Shows skeleton placeholders while user data is being fetched.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-48 mt-2" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* User detail card skeleton */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      </div>

      {/* Memberships skeleton */}
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
          <div className="bg-[var(--surface-2)] p-3">
            <div className="flex gap-8">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="bg-[var(--surface-1)] p-3 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
