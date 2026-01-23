import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { getSsoConfig, updateSsoConfig } from '@/lib/auth/sso';
import { ssoConfigSchema } from '@/lib/validations/sso';
import { createAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

/**
 * GET /api/sso/config
 * Get SSO configuration for current facility/club.
 *
 * Note: Currently facility = club (Team). When facility model is added
 * in Phase 12, this will need to look up the parent facility.
 *
 * Requires: FACILITY_ADMIN role
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Only FACILITY_ADMIN can view SSO config
    // (In current schema, FACILITY_ADMIN at club level = facility admin)
    if (!context.roles.includes('FACILITY_ADMIN')) {
      return forbiddenResponse('Only facility administrators can view SSO configuration');
    }

    const config = await getSsoConfig(context.clubId);

    if (!config) {
      // Return empty config template
      return NextResponse.json({
        config: {
          facilityId: context.clubId,
          enabled: false,
          ssoProviderId: null,
          idpDomain: null,
          idpGroupClaim: 'groups',
          roleMappings: [],
          defaultRole: 'ATHLETE',
          allowOverride: true,
        },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    return serverErrorResponse(error, 'sso-config:GET');
  }
}

/**
 * PUT /api/sso/config
 * Update SSO configuration for current facility/club.
 *
 * Requires: FACILITY_ADMIN role
 */
export async function PUT(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Only FACILITY_ADMIN can update SSO config
    if (!context.roles.includes('FACILITY_ADMIN')) {
      return forbiddenResponse('Only facility administrators can update SSO configuration');
    }

    const body = await request.json();
    const parsed = ssoConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get current config to detect changes
    const oldConfig = await getSsoConfig(context.clubId);

    const config = await updateSsoConfig(context.clubId, parsed.data);

    // Create audit logger
    const audit = createAuditLogger(request, {
      clubId: context.clubId,
      userId: context.userId,
    });

    // Determine which audit action to use based on changes
    let auditAction: 'SSO_CONFIG_UPDATED' | 'SSO_ENABLED' | 'SSO_DISABLED' | 'SSO_ROLE_MAPPING_CHANGED' = 'SSO_CONFIG_UPDATED';

    // Check for specific significant changes
    if (parsed.data.enabled !== undefined) {
      if (parsed.data.enabled && !oldConfig?.enabled) {
        auditAction = 'SSO_ENABLED';
      } else if (!parsed.data.enabled && oldConfig?.enabled) {
        auditAction = 'SSO_DISABLED';
      }
    }

    // Role mapping changes take precedence for audit action
    if (parsed.data.roleMappings !== undefined) {
      auditAction = 'SSO_ROLE_MAPPING_CHANGED';
    }

    // Build metadata based on action type
    const baseMetadata = {
      enabled: parsed.data.enabled,
      ssoProviderId: parsed.data.ssoProviderId,
      idpDomain: parsed.data.idpDomain,
      defaultRole: parsed.data.defaultRole,
    };

    const metadata = parsed.data.roleMappings !== undefined
      ? {
          ...baseMetadata,
          mappingCount: parsed.data.roleMappings.length,
          oldMappingCount: oldConfig?.roleMappings?.length ?? 0,
        }
      : baseMetadata;

    await audit.log({
      action: auditAction,
      targetType: 'SsoConfig',
      targetId: config.id,
      metadata,
    });

    return NextResponse.json({ config });
  } catch (error) {
    return serverErrorResponse(error, 'sso-config:PUT');
  }
}
