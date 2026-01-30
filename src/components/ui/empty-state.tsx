import * as React from "react"
import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateVariant = 'informational' | 'celebration' | 'error'

const variantStyles = {
  informational: {
    container: 'bg-zinc-800',
    icon: 'text-zinc-500',
  },
  celebration: {
    container: 'bg-teal-500/20',
    icon: 'text-teal-400',
  },
  error: {
    container: 'bg-red-500/20',
    icon: 'text-red-400',
  },
} as const

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
  variant?: EmptyStateVariant
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'informational',
}: EmptyStateProps) {
  const styles = variantStyles[variant]

  return (
    <div className={cn("py-12 px-4 text-center flex flex-col items-center justify-center", className)}>
      <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mb-4", styles.container)}>
        <Icon className={cn("h-8 w-8", styles.icon)} />
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
export type { EmptyStateProps, EmptyStateVariant }
