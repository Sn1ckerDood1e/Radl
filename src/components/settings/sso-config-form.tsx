'use client';

import { useState, useCallback } from 'react';
import type { RoleMapping } from '@/lib/validations/sso';

/**
 * Valid roles that can be mapped from SSO
 */
const MAPPABLE_ROLES = ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'] as const;
type MappableRole = typeof MAPPABLE_ROLES[number];

/**
 * SSO configuration data structure
 */
interface SsoConfig {
  facilityId: string;
  enabled: boolean;
  ssoProviderId: string | null;
  idpDomain: string | null;
  idpGroupClaim: string;
  roleMappings: RoleMapping[];
  defaultRole: MappableRole;
  allowOverride: boolean;
}

interface SsoConfigFormProps {
  initialConfig: SsoConfig;
}

/**
 * SSO configuration form for facility admins.
 * Allows enabling/disabling SSO, configuring IDP domain, group claim,
 * role mappings, default role, and override settings.
 */
export function SsoConfigForm({ initialConfig }: SsoConfigFormProps) {
  // --- Form State ---
  const [config, setConfig] = useState<SsoConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // --- Role Mapping Editor State ---
  const [newMappingIdp, setNewMappingIdp] = useState('');
  const [newMappingRoles, setNewMappingRoles] = useState<MappableRole[]>([]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/sso/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          ssoProviderId: config.ssoProviderId,
          idpDomain: config.idpDomain,
          idpGroupClaim: config.idpGroupClaim,
          roleMappings: config.roleMappings,
          defaultRole: config.defaultRole,
          allowOverride: config.allowOverride,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save SSO configuration');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMapping = useCallback(() => {
    if (!newMappingIdp.trim() || newMappingRoles.length === 0) return;

    // Check for duplicate IDP value
    if (config.roleMappings.some(m => m.idpValue === newMappingIdp.trim())) {
      setError('A mapping for this IDP group already exists');
      return;
    }

    setConfig(prev => ({
      ...prev,
      roleMappings: [
        ...prev.roleMappings,
        { idpValue: newMappingIdp.trim(), radlRoles: [...newMappingRoles] },
      ],
    }));
    setNewMappingIdp('');
    setNewMappingRoles([]);
    setError(null);
  }, [newMappingIdp, newMappingRoles, config.roleMappings]);

  const handleRemoveMapping = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      roleMappings: prev.roleMappings.filter((_, i) => i !== index),
    }));
  }, []);

  const handleToggleNewRole = useCallback((role: MappableRole) => {
    setNewMappingRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }, []);

  const inputClassName =
    'block w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';
  const labelClassName = 'block text-sm font-medium text-[var(--text-secondary)] mb-1';

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {error}
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="p-3 text-sm text-teal-400 bg-teal-500/10 border border-teal-500/30 rounded-lg">
          SSO configuration saved successfully
        </div>
      )}

      {/* Enable/Disable SSO */}
      <div className="bg-[var(--surface-2)] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">Enable SSO</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Allow users to sign in with your identity provider
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--surface-1)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
          </label>
        </div>
      </div>

      {/* IDP Configuration */}
      <div className="bg-[var(--surface-2)] rounded-lg p-4">
        <h3 className="font-medium text-[var(--text-primary)] mb-4">
          Identity Provider Settings
        </h3>

        <div className="space-y-4">
          {/* SSO Provider ID */}
          <div>
            <label htmlFor="ssoProviderId" className={labelClassName}>
              SSO Provider ID
            </label>
            <input
              type="text"
              id="ssoProviderId"
              value={config.ssoProviderId || ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  ssoProviderId: e.target.value || null,
                }))
              }
              placeholder="e.g., saml-provider-id from Supabase"
              className={inputClassName}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              The SAML provider ID configured in your authentication system
            </p>
          </div>

          {/* IDP Domain */}
          <div>
            <label htmlFor="idpDomain" className={labelClassName}>
              IDP Domain
            </label>
            <input
              type="text"
              id="idpDomain"
              value={config.idpDomain || ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  idpDomain: e.target.value || null,
                }))
              }
              placeholder="e.g., company.okta.com"
              className={inputClassName}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Email domain(s) that should use SSO login
            </p>
          </div>

          {/* Group Claim */}
          <div>
            <label htmlFor="idpGroupClaim" className={labelClassName}>
              Group Claim Name
            </label>
            <input
              type="text"
              id="idpGroupClaim"
              value={config.idpGroupClaim}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  idpGroupClaim: e.target.value || 'groups',
                }))
              }
              placeholder="groups"
              className={inputClassName}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              The SAML attribute containing user group memberships (default: groups)
            </p>
          </div>
        </div>
      </div>

      {/* Role Mappings */}
      <div className="bg-[var(--surface-2)] rounded-lg p-4">
        <h3 className="font-medium text-[var(--text-primary)] mb-2">Role Mappings</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Map IDP groups to Radl roles. Users with matching groups will be assigned the
          corresponding roles.
        </p>

        {/* Existing Mappings */}
        {config.roleMappings.length > 0 && (
          <div className="space-y-2 mb-4">
            {config.roleMappings.map((mapping, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[var(--surface-1)] rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-[var(--text-primary)]">
                    {mapping.idpValue}
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Maps to:{' '}
                    {mapping.radlRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-block px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-xs mr-1"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMapping(index)}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Mapping */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="newMappingIdp" className={labelClassName}>
                IDP Group Value
              </label>
              <input
                type="text"
                id="newMappingIdp"
                value={newMappingIdp}
                onChange={(e) => setNewMappingIdp(e.target.value)}
                placeholder="e.g., Radl-Coaches"
                className={inputClassName}
              />
            </div>

            <div>
              <label className={labelClassName}>Assign Radl Roles</label>
              <div className="flex flex-wrap gap-2">
                {MAPPABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleToggleNewRole(role)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      newMappingRoles.includes(role)
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddMapping}
              disabled={!newMappingIdp.trim() || newMappingRoles.length === 0}
              className="px-4 py-2 bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Mapping
            </button>
          </div>
        </div>
      </div>

      {/* Default Role & Override */}
      <div className="bg-[var(--surface-2)] rounded-lg p-4">
        <h3 className="font-medium text-[var(--text-primary)] mb-4">Default Settings</h3>

        <div className="space-y-4">
          {/* Default Role */}
          <div>
            <label htmlFor="defaultRole" className={labelClassName}>
              Default Role
            </label>
            <select
              id="defaultRole"
              value={config.defaultRole}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  defaultRole: e.target.value as MappableRole,
                }))
              }
              className={inputClassName}
            >
              {MAPPABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Role assigned when no mapping matches
            </p>
          </div>

          {/* Allow Override */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-[var(--text-primary)]">
                Allow Local Override
              </label>
              <p className="text-sm text-[var(--text-muted)]">
                Allow facility admins to override SSO-derived roles
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.allowOverride}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, allowOverride: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--surface-1)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity font-medium"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
