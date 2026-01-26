import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getClaimsForApiRoute } from '@/lib/auth/claims'
import { defineAbilityFor, type UserContext } from '@/lib/permissions/ability'
import { sortAnnouncementsByPriority, buildActiveAnnouncementsQuery } from '@/lib/utils/announcement-helpers'
import { AnnouncementsManagementClient } from './announcements-management-client'

interface AnnouncementsPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function AnnouncementsPage({ params }: AnnouncementsPageProps) {
  const { teamSlug } = await params

  // Get validated claims
  const { user, clubId, roles, error } = await getClaimsForApiRoute()

  if (error || !user) {
    redirect('/login')
  }

  // Find the team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { id: true, name: true, slug: true },
  })

  if (!team) {
    redirect('/create-team')
  }

  // Verify user has membership in this team
  const [clubMembership, teamMember] = await Promise.all([
    prisma.clubMembership.findFirst({
      where: { clubId: team.id, userId: user.id, isActive: true },
    }),
    prisma.teamMember.findFirst({
      where: { teamId: team.id, userId: user.id },
    }),
  ])

  if (!clubMembership && !teamMember) {
    redirect('/create-team')
  }

  // Get user's roles for this team
  const userRoles = clubMembership?.roles ?? (teamMember ? [teamMember.role] : [])

  // Build ability context
  const userContext: UserContext = {
    userId: user.id,
    clubId: team.id,
    roles: userRoles as UserContext['roles'],
    viewMode: null,
  }
  const ability = defineAbilityFor(userContext)

  // Check if user can manage announcements (coaches only)
  if (!ability.can('manage', 'Announcement')) {
    redirect(`/${teamSlug}`)
  }

  // Fetch active announcements for this team
  const where = buildActiveAnnouncementsQuery(team.id)
  const announcements = await prisma.announcement.findMany({
    where,
    include: {
      practice: {
        select: {
          id: true,
          name: true,
          date: true,
        },
      },
    },
  })

  // Sort by priority
  const sortedAnnouncements = sortAnnouncementsByPriority(announcements)

  // Format announcements for client
  const formattedAnnouncements = sortedAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    priority: a.priority as 'INFO' | 'WARNING' | 'URGENT',
    practiceId: a.practiceId,
    expiresAt: a.expiresAt?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    practice: a.practice
      ? {
          id: a.practice.id,
          name: a.practice.name,
          date: a.practice.date.toISOString(),
        }
      : null,
  }))

  // Fetch upcoming practices for practice-link dropdown
  const now = new Date()
  const upcomingPractices = await prisma.practice.findMany({
    where: {
      teamId: team.id,
      endTime: { gt: now },
    },
    select: {
      id: true,
      name: true,
      date: true,
    },
    orderBy: { date: 'asc' },
    take: 20,
  })

  const formattedPractices = upcomingPractices.map((p) => ({
    id: p.id,
    name: p.name,
    date: p.date.toISOString(),
  }))

  return (
    <AnnouncementsManagementClient
      teamSlug={teamSlug}
      initialAnnouncements={formattedAnnouncements}
      practices={formattedPractices}
    />
  )
}
