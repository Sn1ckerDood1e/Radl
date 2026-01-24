import { Skeleton } from "@/components/ui/skeleton"

export default function RegattasLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Season filter */}
      <div className="mb-6">
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Upcoming section */}
      <section className="mb-8">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <div className="flex items-center gap-4 mb-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Past section */}
      <section>
        <Skeleton className="h-6 w-16 mb-4" />
        <div className="space-y-3 opacity-75">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
