'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Clock, Shield, AlertTriangle, Trash2, Loader2, Users } from 'lucide-react';
import { grantDurations, type GrantDuration } from '@/lib/validations/permission-grant';

interface PermissionGrant {
  id: string;
  clubId: string;
  userId: string;
  grantedBy: string;
  roles: string[];
  reason: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  // Populated fields
  userName?: string;
  grantedByName?: string;
}

interface ClubMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  roles: string[];
}

/**
 * Permission grants management section for admin settings.
 * Allows admins to create and revoke temporary elevated access grants.
 */
export function PermissionGrantsSection() {
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create grant form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<GrantDuration>('1_week');
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchGrants = useCallback(async () => {
    try {
      const response = await fetch('/api/permission-grants');
      if (response.status === 403) {
        // User is not admin - this is expected
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch grants');
      }
      const data = await response.json();
      setGrants(data.grants || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grants');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      // Fetch club members for the grant recipient dropdown
      const response = await fetch('/api/team-settings');
      if (!response.ok) return;

      const data = await response.json();
      if (data.coaches) {
        setMembers(data.coaches.map((c: { userId: string; displayName: string }) => ({
          id: c.userId,
          userId: c.userId,
          displayName: c.displayName,
          email: '',
          roles: ['COACH'],
        })));
      }
    } catch {
      // Ignore errors - members list is optional
    }
  }, []);

  useEffect(() => {
    fetchGrants();
    fetchMembers();
  }, [fetchGrants, fetchMembers]);

  const handleCreateGrant = async () => {
    if (!selectedUserId || selectedRoles.length === 0) return;

    setCreating(true);
    setError(null);

    try {
      // Need to get clubId from context - fetch from grants API response or use current context
      const response = await fetch('/api/permission-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: grants[0]?.clubId || '', // Will be validated server-side
          userId: selectedUserId,
          roles: selectedRoles,
          duration: selectedDuration,
          reason: reason || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create grant');
      }

      // Reset form
      setShowCreateForm(false);
      setSelectedUserId('');
      setSelectedRoles([]);
      setSelectedDuration('1_week');
      setReason('');

      // Refresh grants list
      await fetchGrants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grant');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke this permission grant? The user will immediately lose the elevated access.')) {
      return;
    }

    setRevokingId(grantId);
    setError(null);

    try {
      const response = await fetch(`/api/permission-grants/${grantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke grant');
      }

      // Remove from local state
      setGrants(grants.filter(g => g.id !== grantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke grant');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h remaining`;

    const minutes = Math.floor(diffMs / (1000 * 60));
    return `${minutes}m remaining`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-[var(--surface-2)] rounded-lg p-6 border border-[var(--border)]">
        <div className="animate-pulse">
          <div className="h-6 bg-[var(--surface-1)] rounded w-1/3 mb-4" />
          <div className="h-4 bg-[var(--surface-1)] rounded w-1/2 mb-6" />
          <div className="h-32 bg-[var(--surface-1)] rounded" />
        </div>
      </div>
    );
  }

  const grantableRoles = ['CLUB_ADMIN', 'COACH'];
  const activeGrants = grants.filter(g => !g.revokedAt && new Date(g.expiresAt) > new Date());

  return (
    <div className="bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Temporary Permission Grants
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Grant temporary elevated access to team members
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            New Grant
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Create Grant Form */}
      {showCreateForm && (
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface-1)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
            Create New Grant
          </h3>

          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Team Member
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">Select a team member...</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Roles to Grant
              </label>
              <div className="flex gap-3">
                {grantableRoles.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      {role.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Duration
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value as GrantDuration)}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {Object.entries(grantDurations).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason (optional) */}
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Covering for admin while on vacation"
                maxLength={500}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGrant}
                disabled={!selectedUserId || selectedRoles.length === 0 || creating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Grant'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grants List */}
      <div className="p-6">
        {activeGrants.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[var(--surface-1)] rounded-lg mb-3">
              <Users className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              No active permission grants
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Create a grant to give a team member temporary elevated access
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">
              Active Grants ({activeGrants.length})
            </h3>
            {activeGrants.map((grant) => (
              <div
                key={grant.id}
                className="flex items-center justify-between p-4 bg-[var(--surface-1)] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {grant.userName || 'User ' + grant.userId.slice(0, 8)}
                    </span>
                    <div className="flex gap-1">
                      {grant.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400"
                        >
                          {role.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeRemaining(grant.expiresAt)}
                    </span>
                    <span>
                      Expires {formatDate(grant.expiresAt)}
                    </span>
                    {grant.reason && (
                      <span className="truncate max-w-[200px]" title={grant.reason}>
                        {grant.reason}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeGrant(grant.id)}
                  disabled={revokingId === grant.id}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Revoke grant"
                >
                  {revokingId === grant.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
