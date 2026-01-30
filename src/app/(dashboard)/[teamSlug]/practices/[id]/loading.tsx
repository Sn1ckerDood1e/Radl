import { Skeleton } from "@/components/ui/skeleton"

export default function PracticeDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        {/* Practice header card */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          {/* Name and season */}
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Date and times - 3 column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Practice blocks section */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <Skeleton className="h-6 w-36 mb-4" />

          {/* Block items */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-6" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>

          {/* Add block button */}
          <div className="mt-4 flex justify-center">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Lineups section (water blocks) */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border border-zinc-700 rounded-lg p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-8 w-full rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
