'use client';

import { CopyButton } from '@/components/ui/copy-button';

interface ShareJoinLinkProps {
  joinCode: string;
  baseUrl?: string;
}

/**
 * Displays the team join code and full join link with copy-to-clipboard buttons.
 * Used on roster and invitations pages for coaches to share with members.
 */
export function ShareJoinLink({ joinCode, baseUrl }: ShareJoinLinkProps) {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://radl.app';
  const joinLink = `${appUrl}/join/${joinCode}`;

  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
      <h3 className="font-semibold text-white mb-1">Share Join Link</h3>
      <p className="text-sm text-zinc-400 mb-4">
        Share this link or code with athletes and parents. They can request to join your team, and you can approve their requests.
      </p>

      <div className="space-y-4">
        {/* Team Code */}
        <div className="flex items-center justify-between gap-4 p-3 bg-zinc-800 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 mb-1">Team Code</p>
            <p className="text-xl font-mono font-bold text-emerald-400 select-all">
              {joinCode}
            </p>
          </div>
          <CopyButton
            value={joinCode}
            label="Copy Code"
            successMessage="Team code copied"
          />
        </div>

        {/* Full Join Link */}
        <div className="flex items-center justify-between gap-4 p-3 bg-zinc-800 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 mb-1">Join Link</p>
            <p className="text-sm font-mono text-zinc-300 truncate select-all">
              {joinLink}
            </p>
          </div>
          <CopyButton
            value={joinLink}
            label="Copy Link"
            successMessage="Join link copied"
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Note: Email invitations are not automatically sent. Share this link directly with your team members via email, text, or team chat.
      </p>
    </div>
  );
}
