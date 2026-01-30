import { Skeleton } from "@/components/ui/skeleton"

export default function RosterDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back link */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Header card with avatar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Skeleton className="h-24 w-24 rounded-full" />

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>

      {/* Rowing information card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Contact information card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <Skeleton className="h-6 w-44 mb-4" />
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      {/* Emergency contact card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </div>
  )
}
