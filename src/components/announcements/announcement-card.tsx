'use client'

import * as React from "react"
import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AnnouncementPriorityBadge } from "./announcement-priority-badge"
import { cn } from "@/lib/utils"

interface AnnouncementCardProps {
  announcement: {
    id: string
    title: string
    body: string
    priority: 'INFO' | 'WARNING' | 'URGENT'
    createdAt: string
    practice?: { id: string; name: string; date: string } | null
  }
  isRead: boolean
  onMarkAsRead?: () => void
}

function AnnouncementCard({ announcement, isRead: initialIsRead, onMarkAsRead }: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isRead, setIsRead] = useState(initialIsRead)
  const [isMarking, setIsMarking] = useState(false)

  const handleMarkAsRead = async () => {
    if (isMarking || isRead) return

    setIsMarking(true)
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/read`, {
        method: 'POST',
      })

      if (response.ok) {
        setIsRead(true)
        onMarkAsRead?.()
      }
    } catch (error) {
      console.error('Failed to mark announcement as read:', error)
    } finally {
      setIsMarking(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 p-4 transition-all",
        isRead && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left group flex items-center gap-2 hover:text-emerald-400 transition-colors"
          >
            <h3 className="font-medium text-white group-hover:text-emerald-400">
              {announcement.title}
            </h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-zinc-500 transition-transform shrink-0",
                expanded && "rotate-180"
              )}
            />
          </button>
          <div className="flex items-center gap-2 mt-2">
            <AnnouncementPriorityBadge priority={announcement.priority} />
            {isRead && (
              <div className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <Check className="h-3 w-3" />
                <span>Read</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Practice link badge */}
      {announcement.practice && (
        <div className="mt-2">
          <Link
            href={`/practice/${announcement.practice.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Related to: {announcement.practice.name}</span>
          </Link>
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">
            {announcement.body}
          </p>
        </div>
      )}

      {/* Mark as read button */}
      {!isRead && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAsRead}
            disabled={isMarking}
          >
            {isMarking ? 'Marking...' : 'Mark as read'}
          </Button>
        </div>
      )}
    </div>
  )
}

export { AnnouncementCard }
