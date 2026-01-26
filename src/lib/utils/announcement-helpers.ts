import type { AnnouncementPriority } from '@/generated/prisma';
import type { Prisma } from '@/generated/prisma';

/**
 * Priority order for sorting announcements.
 * Lower values have higher priority (URGENT shown first).
 */
const PRIORITY_ORDER: Record<AnnouncementPriority, number> = {
  URGENT: 0,
  WARNING: 1,
  INFO: 2,
} as const;

/**
 * Sort announcements by priority (URGENT → WARNING → INFO),
 * then by createdAt descending (newest first within same priority).
 *
 * Does not mutate the original array.
 *
 * @param announcements - Array of announcements with priority and createdAt fields
 * @returns New sorted array
 */
export function sortAnnouncementsByPriority<
  T extends { priority: AnnouncementPriority; createdAt: Date }
>(announcements: T[]): T[] {
  return [...announcements].sort((a, b) => {
    // First sort by priority order
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Within same priority, newest first
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * Build Prisma where clause for active announcements.
 *
 * Active means:
 * - Not archived (archivedAt: null)
 * - Not expired:
 *   - For non-practice announcements: expiresAt is null OR expiresAt > now
 *   - For practice-linked announcements: practice.endTime > now (auto-expiry)
 *
 * Note: Prisma sorts enums alphabetically (INFO, URGENT, WARNING),
 * which doesn't match business priority order. Always use client-side
 * sortAnnouncementsByPriority() after querying.
 *
 * @param teamId - Team to filter by
 * @param practiceId - Optional practice ID for practice-specific announcements
 * @returns Prisma where clause
 */
export function buildActiveAnnouncementsQuery(
  teamId: string,
  practiceId?: string | null
): Prisma.AnnouncementWhereInput {
  const now = new Date();

  const baseWhere: Prisma.AnnouncementWhereInput = {
    teamId,
    archivedAt: null,
    OR: [
      // Non-practice announcements: check expiresAt
      {
        practiceId: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      // Practice-linked announcements: check practice.endTime
      {
        practiceId: { not: null },
        practice: {
          endTime: { gt: now },
        },
      },
    ],
  };

  // If practiceId provided, filter to practice-specific announcements
  if (practiceId) {
    return {
      ...baseWhere,
      practiceId,
    };
  }

  return baseWhere;
}
