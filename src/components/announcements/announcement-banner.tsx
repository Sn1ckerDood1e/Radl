'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnnouncementBannerProps {
  announcement: {
    id: string
    title: string
    body: string
    priority: 'URGENT'
  }
}

function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const [visible, setVisible] = useState(false) // Start hidden for hydration safety

  useEffect(() => {
    const dismissalKey = `announcement-dismissed-${announcement.id}`
    const dismissed = localStorage.getItem(dismissalKey)
    setVisible(!dismissed)
  }, [announcement.id])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible) {
        handleDismiss()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [visible])

  const handleDismiss = () => {
    const dismissalKey = `announcement-dismissed-${announcement.id}`
    const timestamp = new Date().toISOString()
    localStorage.setItem(dismissalKey, timestamp)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-lg border border-red-500/30 bg-red-500/10 p-4",
        "transition-all duration-300 ease-in-out"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-400 mb-1">
            {announcement.title}
          </h3>
          <p className="text-sm text-red-300/90 whitespace-pre-wrap">
            {announcement.body}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss urgent announcement"
          className={cn(
            "flex-shrink-0 rounded-md p-1.5 text-red-400 hover:text-red-300",
            "hover:bg-red-500/20 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export { AnnouncementBanner }
