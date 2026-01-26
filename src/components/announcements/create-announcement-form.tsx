'use client'

import * as React from "react"
import { useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { showSuccessToast, showErrorToast } from "@/lib/toast-helpers"
import { cn } from "@/lib/utils"

interface CreateAnnouncementFormProps {
  teamSlug: string
  practices?: Array<{ id: string; name: string; date: string }>
  announcement?: {
    id: string
    title: string
    body: string
    priority: 'INFO' | 'WARNING' | 'URGENT'
    practiceId?: string | null
    expiresAt?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

// Client-side validation schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  body: z.string().min(1, 'Body is required').max(1000, 'Body must be 1000 characters or less'),
  priority: z.enum(['INFO', 'WARNING', 'URGENT']),
  practiceId: z.string().optional(),
  expiresAt: z.string().optional(),
}).refine(
  (data) => {
    if (data.expiresAt) {
      return new Date(data.expiresAt) > new Date()
    }
    return true
  },
  { message: 'Expiry date must be in the future', path: ['expiresAt'] }
)

function CreateAnnouncementForm({
  teamSlug,
  practices = [],
  announcement,
  onSuccess,
  onCancel,
}: CreateAnnouncementFormProps) {
  const isEditing = !!announcement

  // Form state
  const [title, setTitle] = useState(announcement?.title || '')
  const [body, setBody] = useState(announcement?.body || '')
  const [priority, setPriority] = useState<'INFO' | 'WARNING' | 'URGENT'>(announcement?.priority || 'INFO')
  const [practiceId, setPracticeId] = useState(announcement?.practiceId || '')
  const [expiresAt, setExpiresAt] = useState(
    announcement?.expiresAt
      ? new Date(announcement.expiresAt).toISOString().slice(0, 16) // Format for datetime-local input
      : ''
  )

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate form data
    const formData = {
      title: title.trim(),
      body: body.trim(),
      priority,
      practiceId: practiceId || undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    }

    const result = formSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (field) {
          fieldErrors[field.toString()] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const url = isEditing
        ? `/api/announcements/${announcement.id}`
        : '/api/announcements'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.data.title,
          body: result.data.body,
          priority: result.data.priority,
          practiceId: result.data.practiceId || null,
          expiresAt: result.data.expiresAt || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} announcement`)
      }

      showSuccessToast(isEditing ? 'Announcement updated' : 'Announcement created')
      onSuccess?.()
    } catch (error) {
      showErrorToast({
        message: `Failed to ${isEditing ? 'update' : 'create'} announcement`,
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format date for display in practice dropdown
  const formatPracticeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          maxLength={100}
          className={cn(
            "bg-zinc-800/50 border-zinc-700",
            errors.title && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? (
            <p className="text-sm text-red-400">{errors.title}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-zinc-500">{title.length}/100</span>
        </div>
      </div>

      {/* Body */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter your announcement message..."
          rows={4}
          maxLength={1000}
          className={cn(
            "w-full rounded-md border bg-zinc-800/50 border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
            "resize-none",
            errors.body && "border-red-500 focus:ring-red-500"
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.body ? (
            <p className="text-sm text-red-400">{errors.body}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-zinc-500">{body.length}/1000</span>
        </div>
      </div>

      {/* Priority */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Priority
        </label>
        <Select value={priority} onValueChange={(v) => setPriority(v as 'INFO' | 'WARNING' | 'URGENT')}>
          <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INFO">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Info</span>
              </div>
            </SelectItem>
            <SelectItem value="WARNING">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span>Warning</span>
              </div>
            </SelectItem>
            <SelectItem value="URGENT">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span>Urgent</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500 mt-1">
          Urgent announcements appear as a banner at the top of team pages.
        </p>
      </div>

      {/* Practice Link (optional) */}
      {practices.length > 0 && (
        <div>
          <label htmlFor="practiceId" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Link to Practice (optional)
          </label>
          <Select value={practiceId || ''} onValueChange={setPracticeId}>
            <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Select a practice..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                <span className="text-zinc-400">No linked practice</span>
              </SelectItem>
              {practices.map((practice) => (
                <SelectItem key={practice.id} value={practice.id}>
                  {practice.name} - {formatPracticeDate(practice.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500 mt-1">
            Practice-linked announcements auto-expire when the practice ends.
          </p>
        </div>
      )}

      {/* Expiry Date (optional) */}
      <div>
        <label htmlFor="expiresAt" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Expiry Date (optional)
        </label>
        <Input
          id="expiresAt"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className={cn(
            "bg-zinc-800/50 border-zinc-700",
            errors.expiresAt && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {errors.expiresAt && (
          <p className="text-sm text-red-400 mt-1">{errors.expiresAt}</p>
        )}
        <p className="text-xs text-zinc-500 mt-1">
          Leave empty for no automatic expiry.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
        >
          {isSubmitting
            ? (isEditing ? 'Saving...' : 'Creating...')
            : (isEditing ? 'Save Changes' : 'Create Announcement')
          }
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

export { CreateAnnouncementForm }
