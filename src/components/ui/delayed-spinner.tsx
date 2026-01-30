'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface DelayedSpinnerProps {
  delay?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

function DelayedSpinner({ delay = 300, className, size = 'md' }: DelayedSpinnerProps) {
  const [showSpinner, setShowSpinner] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSpinner(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!showSpinner) return null

  return (
    <svg
      className={cn("animate-spin text-teal-500", sizeClasses[size], className)}
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
  )
}

export { DelayedSpinner }
export type { DelayedSpinnerProps }
