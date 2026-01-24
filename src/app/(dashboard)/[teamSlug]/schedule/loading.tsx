import { Skeleton } from "@/components/ui/skeleton"

export default function ScheduleLoading() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar section */}
        <div className="min-w-0">
          {/* Season selector and export */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-20" />
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="text-center">
              <Skeleton className="h-6 w-40 mb-1 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>

          {/* Calendar grid */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-8 mx-auto" />
              ))}
            </div>

            {/* Calendar day cells */}
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <Skeleton key={dayIndex} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected day events sidebar */}
        <div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>

            {/* Event cards */}
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
