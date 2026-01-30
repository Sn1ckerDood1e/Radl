import { Skeleton } from "@/components/ui/skeleton"

export default function EquipmentDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm mb-4">
          <li>
            <Skeleton className="h-4 w-20" />
          </li>
          <li>
            <Skeleton className="h-4 w-4" />
          </li>
          <li>
            <Skeleton className="h-4 w-32" />
          </li>
        </ol>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </nav>

      <div className="space-y-6">
        {/* Equipment details card */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-16" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
          {/* Notes section */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>

        {/* Usage history section */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Damage history section */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
