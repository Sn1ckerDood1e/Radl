'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { Megaphone } from "lucide-react"
import Link from "next/link"
import { AnnouncementCard } from "./announcement-card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

interface AnnouncementListProps {
  teamSlug: string
  initialAnnouncements?: Array<{
    id: string
    title: string
    body: string
    priority: 'INFO' | 'WARNING' | 'URGENT'
    createdAt: string
    isRead: boolean
    practice?: { id: string; name: string; date: string } | null
  }>
  showEmpty?: boolean
  isCoach?: boolean
}

function AnnouncementList({
  teamSlug,
  initialAnnouncements,
  showEmpty = true,
  isCoach = false,
}: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements || [])
  const [loading, setLoading] = useState(!initialAnnouncements)

  useEffect(() => {
    // Only fetch if no initial data provided
    if (initialAnnouncements) return

    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (response.ok) {
          const data = await response.json()
          setAnnouncements(data.announcements || [])
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [initialAnnouncements])

  const handleMarkAsRead = (announcementId: string) => {
    // Update local state to reflect read status
    setAnnouncements((prev) =>
      prev.map((a) =>
        a.id === announcementId ? { ...a, isRead: true } : a
      )
    )
  }

  if (loading) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Announcements</h2>
        </div>
        <div className="space-y-3">
          <div className="h-24 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-24 bg-zinc-800 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Announcements</h2>
        </div>
        <div className="flex items-center gap-3">
          {announcements.length > 5 && (
            <Link
              href={`/${teamSlug}/announcements`}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View All
            </Link>
          )}
          {isCoach && (
            <Link
              href={`/${teamSlug}/announcements`}
              className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Manage
            </Link>
          )}
        </div>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        showEmpty && (
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            description="Check back later for updates from your coaches."
            className="py-8"
          />
        )
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {announcements.slice(0, 5).map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isRead={announcement.isRead}
              onMarkAsRead={() => handleMarkAsRead(announcement.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { AnnouncementList }
