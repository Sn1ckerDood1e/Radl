'use client';

import { useState } from 'react';
import { InviteMemberForm } from '@/components/forms/invite-member-form';
import { CSVImportForm } from '@/components/forms/csv-import-form';

interface Invitation {
  id: string;
  email: string | null;
  userId: string | null;
  role: 'FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  createdAt: string;
  acceptedAt: string | null;
}

interface InvitationsClientProps {
  teamSlug: string;
  invitations: Invitation[];
  athleteCount: number;
}

export function InvitationsClient({
  teamSlug,
  invitations: initialInvitations,
  athleteCount,
}: InvitationsClientProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [activeTab, setActiveTab] = useState<'invite' | 'bulk' | 'pending'>('invite');
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING');
  const acceptedInvitations = invitations.filter(inv => inv.status === 'ACCEPTED');

  const handleRevoke = async (invitationId: string) => {
    setIsRevoking(invitationId);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvitations(prev =>
          prev.map(inv =>
            inv.id === invitationId ? { ...inv, status: 'REVOKED' as const } : inv
          )
        );
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
    } finally {
      setIsRevoking(null);
    }
  };

  const handleApprove = async (invitationId: string, userId: string) => {
    setIsApproving(invitationId);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', userId }),
      });

      if (response.ok) {
        setInvitations(prev =>
          prev.map(inv =>
            inv.id === invitationId
              ? { ...inv, status: 'ACCEPTED' as const, acceptedAt: new Date().toISOString() }
              : inv
          )
        );
      }
    } catch (error) {
      console.error('Failed to approve invitation:', error);
    } finally {
      setIsApproving(null);
    }
  };

  const refreshInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      const data = await response.json();
      if (data.invitations) {
        setInvitations(data.invitations.map((inv: Invitation & { createdAt: string; acceptedAt: string | null }) => ({
          ...inv,
          createdAt: inv.createdAt,
          acceptedAt: inv.acceptedAt,
        })));
      }
    } catch (error) {
      console.error('Failed to refresh invitations:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-zinc-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('invite')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'invite'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            Invite Member
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'bulk'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            Bulk Import
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            Pending
            {pendingInvitations.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'invite' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Invite a Member</h2>
          <InviteMemberForm teamSlug={teamSlug} onSuccess={refreshInvitations} />
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Bulk Import</h2>
          <CSVImportForm onSuccess={refreshInvitations} />
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-white">Pending Invitations</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Email invitations waiting to be accepted
              </p>
            </div>

            {pendingInvitations.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">
                No pending invitations
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {pendingInvitations.map(invitation => {
                  // Team code join requests have userId set (the requesting user)
                  // Email invites don't have userId until accepted
                  const isTeamCodeJoinRequest = invitation.userId !== null;
                  const isActionInProgress = isRevoking === invitation.id || isApproving === invitation.id;

                  return (
                    <div
                      key={invitation.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {invitation.email || 'Unknown user'}
                          {isTeamCodeJoinRequest && (
                            <span className="ml-2 text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                              Join request
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {invitation.role} - {isTeamCodeJoinRequest ? 'Requested' : 'Invited'} {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {isTeamCodeJoinRequest && (
                          <button
                            onClick={() => handleApprove(invitation.id, invitation.userId!)}
                            disabled={isActionInProgress}
                            className="text-sm text-teal-400 hover:text-teal-300 disabled:opacity-50 transition-colors"
                          >
                            {isApproving === invitation.id ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                        <button
                          onClick={() => handleRevoke(invitation.id)}
                          disabled={isActionInProgress}
                          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                        >
                          {isRevoking === invitation.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently Accepted */}
          {acceptedInvitations.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-lg font-medium text-white">Recently Accepted</h2>
              </div>
              <div className="divide-y divide-zinc-800">
                {acceptedInvitations.slice(0, 10).map(invitation => (
                  <div
                    key={invitation.id}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{invitation.email}</p>
                      <p className="text-sm text-zinc-500">
                        {invitation.role} - Joined {invitation.acceptedAt
                          ? new Date(invitation.acceptedAt).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-400">
                      Accepted
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div className="flex gap-4 text-sm text-zinc-500">
        <span>Athletes: {athleteCount}</span>
        <span>|</span>
        <span>Pending invites: {pendingInvitations.length}</span>
      </div>
    </div>
  );
}
