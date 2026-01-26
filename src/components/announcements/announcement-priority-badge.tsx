import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, AlertTriangle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
  {
    variants: {
      priority: {
        INFO: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
        WARNING: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        URGENT: "bg-red-500/15 text-red-400 border border-red-500/20",
      },
    },
    defaultVariants: {
      priority: "INFO",
    },
  }
)

interface AnnouncementPriorityBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const priorityIcons = {
  INFO: Info,
  WARNING: AlertTriangle,
  URGENT: AlertCircle,
}

function AnnouncementPriorityBadge({
  priority = "INFO",
  className,
  ...props
}: AnnouncementPriorityBadgeProps) {
  const Icon = priorityIcons[priority as keyof typeof priorityIcons] || Info

  return (
    <div className={cn(badgeVariants({ priority, className }))} {...props}>
      <Icon className="h-3 w-3" />
      <span>{priority}</span>
    </div>
  )
}

export { AnnouncementPriorityBadge, badgeVariants }
