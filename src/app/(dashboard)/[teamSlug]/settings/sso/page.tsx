import { Suspense } from 'react';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { redirect } from 'next/navigation';
import { getSsoConfig } from '@/lib/auth/sso';
import { SsoConfigForm } from '@/components/settings/sso-config-form';

export const metadata = {
  title: 'SSO Settings - Settings',
};

interface SsoSettingsPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function SsoSettingsPage({ params }: SsoSettingsPageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, userRoles } = await requireTeamBySlug(teamSlug);

  // Check user has FACILITY_ADMIN role
  const isFacilityAdmin = userRoles.some((r) => r === 'FACILITY_ADMIN');

  if (!isFacilityAdmin) {
    redirect('/unauthorized');
  }

  const clubId = team.id;

  // Get existing SSO configuration
  const existingConfig = await getSsoConfig(clubId);

  // Prepare config for form (ensure all fields have values)
  const config = existingConfig
    ? {
        facilityId: existingConfig.facilityId,
        enabled: existingConfig.enabled,
        ssoProviderId: existingConfig.ssoProviderId,
        idpDomain: existingConfig.idpDomain,
        idpGroupClaim: existingConfig.idpGroupClaim,
        roleMappings: existingConfig.roleMappings,
        defaultRole: existingConfig.defaultRole as
          | 'FACILITY_ADMIN'
          | 'CLUB_ADMIN'
          | 'COACH'
          | 'ATHLETE'
          | 'PARENT',
        allowOverride: existingConfig.allowOverride,
      }
    : {
        facilityId: clubId,
        enabled: false,
        ssoProviderId: null,
        idpDomain: null,
        idpGroupClaim: 'groups',
        roleMappings: [],
        defaultRole: 'ATHLETE' as const,
        allowOverride: true,
      };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Single Sign-On (SSO)
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Configure SAML SSO to allow users to sign in with your identity provider.
        </p>
      </div>

      {/* Setup Help */}
      <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <h3 className="font-medium text-blue-400 mb-2">Setting up SSO</h3>
        <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
          <li>
            Configure a SAML 2.0 application in your identity provider (Okta, Azure AD,
            Google Workspace, etc.)
          </li>
          <li>
            Set up the SSO provider in your authentication system and note the provider ID
          </li>
          <li>Enter the provider ID and your IDP domain below</li>
          <li>
            Configure role mappings to automatically assign RowOps roles based on IDP
            groups
          </li>
          <li>Enable SSO when ready</li>
        </ol>
        <p className="text-sm text-[var(--text-muted)] mt-3">
          Need help? Contact RowOps support for assisted setup.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="animate-pulse h-96 bg-[var(--surface-2)] rounded-lg" />
        }
      >
        <SsoConfigForm initialConfig={config} />
      </Suspense>
    </div>
  );
}
