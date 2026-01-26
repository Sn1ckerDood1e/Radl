---
phase: 19-announcements-system
plan: 04
status: complete
completed: 2026-01-26
commits:
  - 9adc290: "feat(19-04): create announcement management page and form"
  - 55bbf0f: "feat(19-04): integrate announcements into dashboard and layout"
  - af7abf0: "refactor(dashboard): replace redundant nav cards with useful content"
  - 05aaf49: "fix(19): restructure Zod schema to allow partial on refinement"
  - 15ce455: "feat(19): improve expiry date UX with quick options"
---

# Plan 19-04 Summary: Page Integration

## What Was Built

### Coach Announcement Management Page
- **Route:** `/{teamSlug}/announcements`
- **Access:** Coach-only (redirects non-coaches)
- **Features:**
  - List all active announcements with priority badges
  - Create new announcements via dialog form
  - Edit existing announcements
  - Archive (soft delete) announcements

### CreateAnnouncementForm Component
- **Location:** `src/components/announcements/create-announcement-form.tsx`
- **Fields:**
  - Title (required, max 100 chars)
  - Body/message (required, max 1000 chars)
  - Priority selector with color indicators (Info/Warning/Urgent)
  - Optional practice linking
  - User-friendly expiry options: Never, 1 hour, End of day, 1 week, Custom

### Dashboard Integration
- Announcements widget always shows for coaches (with empty state CTA)
- Shows for athletes when announcements exist
- "Manage" link visible to coaches only
- Removed redundant navigation cards (Equipment, Roster, etc.)
- Added "Upcoming Practices" section showing next 5 scheduled

### Layout Banner Integration
- Urgent announcements display as dismissible banner at top of team pages
- Banner uses localStorage for dismissal persistence
- Only shows most recent urgent announcement to avoid fatigue

### Sidebar Navigation Updates
- Added Schedule to navigation items
- Settings now visible to coaches (changed permission check)

## Key Decisions

1. **Expiry UX:** Quick options (Never, 1 hour, End of day, 1 week, Custom) instead of just datetime picker
2. **Dashboard cleanup:** Removed redundant nav cards since sidebar now has all navigation
3. **Settings visibility:** Changed from `manage Team` to `manage Practice` so coaches can access

## Files Modified

- `src/app/(dashboard)/[teamSlug]/announcements/page.tsx` (created)
- `src/app/(dashboard)/[teamSlug]/announcements/announcements-management-client.tsx` (created)
- `src/components/announcements/create-announcement-form.tsx` (created)
- `src/app/(dashboard)/[teamSlug]/page.tsx` (dashboard integration)
- `src/app/(dashboard)/[teamSlug]/layout.tsx` (banner integration)
- `src/components/announcements/announcement-list.tsx` (added isCoach prop)
- `src/components/layout/navigation-sidebar.tsx` (added Schedule, fixed Settings)
- `src/lib/validations/announcement.ts` (fixed Zod partial refinement issue)

## Verification

Human verification completed:
- Coach can create/edit/archive announcements
- Dashboard shows announcements widget with Manage link
- Urgent banner appears and dismisses correctly
- Athletes see read-only announcements
- Expiry options work correctly

## Requirements Satisfied

- **ANN-01:** Coach can create announcements with priority levels
- **ANN-02:** Announcements display on dashboard for all users
- **ANN-03:** Urgent announcements show as banner
