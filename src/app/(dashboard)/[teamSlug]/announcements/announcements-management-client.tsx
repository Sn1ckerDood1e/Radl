'use client'

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { Plus, Megaphone, Pencil, Archive, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CreateAnnouncementForm } from "@/components/announcements/create-announcement-form"
import { AnnouncementPriorityBadge } from "@/components/announcements/announcement-priority-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { showSuccessToast, showErrorToast } from "@/lib/toast-helpers"
import { cn } from "@/lib/utils"

interface Announcement {
  id: string
  title: string
  body: string
  priority: 'INFO' | 'WARNING' | 'URGENT'
  practiceId: string | null
  expiresAt: string | null
  createdAt: string
  practice: { id: string; name: string; date: string } | null
}

interface Practice {
  id: string
  name: string
  date: string
}

interface AnnouncementsManagementClientProps {
  teamSlug: string
  initialAnnouncements: Announcement[]
  practices: Practice[]
}

function AnnouncementsManagementClient({
  teamSlug,
  initialAnnouncements,
  practices,
}: AnnouncementsManagementClientProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false)
    // Refresh announcements from server
    refreshAnnouncements()
  }

  const handleEditSuccess = () => {
    setEditingAnnouncement(null)
    refreshAnnouncements()
  }

  const refreshAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      }
    } catch (error) {
      console.error('Failed to refresh announcements:', error)
    }
  }

  const handleArchive = async (id: string) => {
    if (archivingId) return

    setArchivingId(id)

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to archive announcement')
      }

      // Remove from local state
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      showSuccessToast('Announcement archived')
    } catch (error) {
      showErrorToast({
        message: 'Failed to archive announcement',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setArchivingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatPracticeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/${teamSlug}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>
      <p className="text-zinc-400 mb-8 ml-8">
        Create and manage announcements for your team. Urgent announcements appear as banners.
      </p>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Create your first announcement to communicate with your team."
          action={{
            label: "Create Announcement",
            onClick: () => setIsCreateDialogOpen(true),
          }}
          className="py-16"
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={cn(
                "bg-[var(--surface-1)] rounded-xl border p-5",
                announcement.priority === 'URGENT' && "border-red-500/30",
                announcement.priority === 'WARNING' && "border-amber-500/30",
                announcement.priority === 'INFO' && "border-[var(--border-subtle)]"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white truncate">
                      {announcement.title}
                    </h3>
                    <AnnouncementPriorityBadge priority={announcement.priority} />
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
                    {announcement.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span>Created {formatDate(announcement.createdAt)}</span>
                    {announcement.practice && (
                      <span className="text-teal-400">
                        Linked to: {announcement.practice.name} ({formatPracticeDate(announcement.practice.date)})
                      </span>
                    )}
                    {announcement.expiresAt && (
                      <span className="text-amber-400">
                        Expires {formatDate(announcement.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditingAnnouncement(announcement)}
                    title="Edit announcement"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleArchive(announcement.id)}
                    disabled={archivingId === announcement.id}
                    title="Archive announcement"
                    className="text-zinc-400 hover:text-red-400"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Priority Legend */}
      <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Priority Levels</h4>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-400" />
            <span className="text-zinc-400">Info - General updates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="text-zinc-400">Warning - Important notices</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <span className="text-zinc-400">Urgent - Banner display</span>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>
              Create an announcement to communicate with your team.
            </DialogDescription>
          </DialogHeader>
          <CreateAnnouncementForm
            teamSlug={teamSlug}
            practices={practices}
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && setEditingAnnouncement(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update your announcement details.
            </DialogDescription>
          </DialogHeader>
          {editingAnnouncement && (
            <CreateAnnouncementForm
              teamSlug={teamSlug}
              practices={practices}
              announcement={editingAnnouncement}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingAnnouncement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { AnnouncementsManagementClient }
