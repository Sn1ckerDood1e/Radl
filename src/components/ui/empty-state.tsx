import * as React from "react"
import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 px-4 text-center flex flex-col items-center justify-center", className)}>
      <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-zinc-500 max-w-sm mb-6">{description}</p>
      {action && (
        <>
          {action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </>
      )}
    </div>
  )
}

export { EmptyState }
