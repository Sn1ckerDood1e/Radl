import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { createDamageReportSchema } from '@/lib/validations/damage-report';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getUserEmailsByIds } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  // Rate limit check FIRST - before any database operations
  const clientIp = getClientIp(request);
  const rateLimit = await checkRateLimit(clientIp, 'damage-report');

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many damage reports. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      }
    );
  }

  try {
    const { id: equipmentId } = await params;

    // Parse body first for honeypot check
    const body = await request.json();

    // Honeypot check - silent rejection (return 201 to not reveal detection)
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({ success: true, damageReport: { id: 'blocked' } }, { status: 201 });
    }

    const validationResult = createDamageReportSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { location, description, severity, reporterName, category } = validationResult.data;

    // Verify equipment exists and get teamId + team name
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true, teamId: true, name: true, team: { select: { name: true } } },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Equipment must have a teamId to create damage reports (facility-owned equipment handled separately)
    if (!equipment.teamId) {
      return NextResponse.json({ error: 'Equipment has no team association' }, { status: 400 });
    }

    const teamId = equipment.teamId;
    const photoUrl = body.photoUrl || null; // Optional, already uploaded to Storage

    // Try to get authenticated user (optional)
    let reportedBy: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        reportedBy = user.id;
      }
    } catch {
      // Anonymous submission is fine
    }

    // Create damage report
    const damageReport = await prisma.damageReport.create({
      data: {
        equipmentId,
        teamId,
        reportedBy,
        reporterName,
        location,
        description,
        severity,
        category: category || null,
        photoUrl,
        status: 'OPEN',
      },
    });

    // Create notifications for coaches
    let notifyUserIds: string[] = [];

    // Check team settings for custom recipients
    const settings = await prisma.teamSettings.findUnique({
      where: { teamId },
      select: { damageNotifyUserIds: true },
    });

    if (settings?.damageNotifyUserIds?.length) {
      notifyUserIds = settings.damageNotifyUserIds;
    } else {
      // Default: notify all coaches
      const coaches = await prisma.teamMember.findMany({
        where: { teamId, role: 'COACH' },
        select: { userId: true },
      });
      notifyUserIds = coaches.map(c => c.userId);
    }

    // Create in-app notifications for each recipient
    if (notifyUserIds.length > 0) {
      const severityPrefix = severity === 'CRITICAL' ? '[CRITICAL] ' : '';
      const truncatedDesc = description.substring(0, 80) + (description.length > 80 ? '...' : '');

      await prisma.notification.createMany({
        data: notifyUserIds.map(userId => ({
          teamId,
          userId,
          type: 'DAMAGE_REPORT',
          title: `${severityPrefix}Damage: ${equipment.name}`,
          message: `${reporterName}: ${truncatedDesc}`,
          linkUrl: `/equipment/${equipment.id}`,
        })),
      });
    }

    // Send email notification for CRITICAL severity only
    if (severity === 'CRITICAL' && notifyUserIds.length > 0) {
      // Get coach emails using admin API (gracefully degrades if not configured)
      const userEmails = await getUserEmailsByIds(notifyUserIds);
      const coachEmails = userEmails.map(u => u.email);

      if (coachEmails.length > 0) {
        try {
          const { sendCriticalDamageAlert } = await import('@/lib/email/templates/critical-alert');
          await sendCriticalDamageAlert(coachEmails, {
            teamName: equipment.team?.name || 'Unknown Team',
            equipmentName: equipment.name,
            equipmentId: equipment.id,
            reporterName,
            location,
            description,
            category: category || undefined,
            photoUrl: photoUrl || undefined,
            reportId: damageReport.id,
          });
        } catch (emailError) {
          // Email failures should not fail the API request
          console.error('Failed to send critical damage email:', emailError);
        }
      }
    }

    return NextResponse.json(
      { success: true, damageReport: { id: damageReport.id } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating damage report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
