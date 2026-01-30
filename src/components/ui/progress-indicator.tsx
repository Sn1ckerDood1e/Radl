'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressIndicatorProps {
  isActive: boolean
  threshold?: number
  message?: string
  className?: string
}

function ProgressIndicator({
  isActive,
  threshold = 10000,
  message = "This is taking longer than expected...",
  className,
}: ProgressIndicatorProps) {
  const [showIndicator, setShowIndicator] = React.useState(false)

  React.useEffect(() => {
    if (!isActive) {
      setShowIndicator(false)
      return
    }

    const timer = setTimeout(() => setShowIndicator(true), threshold)
    return () => clearTimeout(timer)
  }, [isActive, threshold])

  if (!showIndicator) return null

  return (
    <div
      className={cn(
        "p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <svg
          className="animate-spin h-5 w-5 text-amber-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-amber-400 text-sm">{message}</p>
      </div>
    </div>
  )
}

export { ProgressIndicator }
export type { ProgressIndicatorProps }
