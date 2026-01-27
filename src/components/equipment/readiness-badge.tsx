import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Equipment readiness status levels (traffic light pattern).
 * This type should match the one in @/lib/equipment/readiness.ts once Plan 02 completes.
 */
export type ReadinessStatus = 'OUT_OF_SERVICE' | 'NEEDS_ATTENTION' | 'INSPECT_SOON' | 'READY';

/**
 * CVA variants for readiness badge styling.
 * Traffic light colors: green (ready), yellow (soon), amber (attention), red (out).
 */
const readinessBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
  {
    variants: {
      status: {
        READY: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        INSPECT_SOON: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
        NEEDS_ATTENTION: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        OUT_OF_SERVICE: "bg-red-500/15 text-red-400 border border-red-500/20",
      },
    },
    defaultVariants: {
      status: "READY",
    },
  }
)

/**
 * Icons for each readiness status.
 */
const statusIcons = {
  READY: CheckCircle2,
  INSPECT_SOON: Clock,
  NEEDS_ATTENTION: AlertTriangle,
  OUT_OF_SERVICE: XCircle,
} as const

/**
 * Human-readable labels for each status.
 */
const statusLabels: Record<ReadinessStatus, string> = {
  READY: "Ready",
  INSPECT_SOON: "Inspect Soon",
  NEEDS_ATTENTION: "Needs Attention",
  OUT_OF_SERVICE: "Out of Service",
}

interface ReadinessBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof readinessBadgeVariants> {
  /** Show icon alongside label. Default: true */
  showIcon?: boolean
  /** Show label text. Default: true (set false for icon-only compact mode) */
  showLabel?: boolean
}

/**
 * Equipment readiness status badge with traffic light colors.
 *
 * Usage:
 * ```tsx
 * <ReadinessBadge status="READY" />
 * <ReadinessBadge status="NEEDS_ATTENTION" showIcon={false} />
 * <ReadinessBadge status="OUT_OF_SERVICE" showLabel={false} /> // icon only
 * ```
 */
function ReadinessBadge({
  status = "READY",
  showIcon = true,
  showLabel = true,
  className,
  ...props
}: ReadinessBadgeProps) {
  const Icon = statusIcons[status as ReadinessStatus] || CheckCircle2
  const label = statusLabels[status as ReadinessStatus] || status

  return (
    <div
      className={cn(readinessBadgeVariants({ status, className }))}
      {...props}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {showLabel && <span>{label}</span>}
    </div>
  )
}

export { ReadinessBadge, readinessBadgeVariants }
