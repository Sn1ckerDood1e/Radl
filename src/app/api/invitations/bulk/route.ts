import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bulkInviteSchema } from '@/lib/validations/invitation';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

interface BulkInviteResult {
  created: number;
  failed: Array<{ email: string; reason: string }>;
}

// POST: Bulk import invitations from CSV
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can bulk import invitations');

    // Parse and validate request body
    const body = await request.json();
    const validationResult = bulkInviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { invitations } = validationResult.data;

    // Get existing pending invitations for this team
    const existingInvitations = await prisma.invitation.findMany({
      where: {
        teamId: claims.team_id,
        status: 'PENDING',
      },
      select: { email: true },
    });

    const existingEmails = new Set(
      existingInvitations
        .map(inv => inv.email?.toLowerCase())
        .filter((email): email is string => email !== null)
    );

    const result: BulkInviteResult = {
      created: 0,
      failed: [],
    };

    // Process each invitation
    const toCreate: Array<{
      teamId: string;
      email: string;
      role: 'ATHLETE' | 'PARENT';
      status: 'PENDING';
      invitedBy: string;
    }> = [];

    for (const invite of invitations) {
      const email = invite.email.toLowerCase();

      // Check for duplicates in existing invitations
      if (existingEmails.has(email)) {
        result.failed.push({
          email: invite.email,
          reason: 'Invitation already exists',
        });
        continue;
      }

      // Check for duplicates within the batch
      if (toCreate.some(c => c.email === email)) {
        result.failed.push({
          email: invite.email,
          reason: 'Duplicate email in batch',
        });
        continue;
      }

      toCreate.push({
        teamId: claims.team_id,
        email,
        role: invite.role,
        status: 'PENDING',
        invitedBy: user.id,
      });
    }

    // Bulk create invitations
    if (toCreate.length > 0) {
      await prisma.invitation.createMany({
        data: toCreate,
      });
      result.created = toCreate.length;
    }

    // NOTE: Email sending not implemented in v1 - coaches share join link manually
    // See: .planning/phases/01-foundation-multi-tenancy/01-KNOWN-LIMITATIONS.md
    // TODO(v2): Implement with Resend per limitation doc

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return serverErrorResponse(error, 'invitations/bulk:POST');
  }
}
