'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Link as LinkIcon, Unlink, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionStatus {
  connected: boolean;
  rcClubId?: string;
  autoSyncEnabled?: boolean;
  lastSyncAt?: string;
}

interface Season {
  id: string;
  name: string;
  status: string;
}

export function RCSettingsSection() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;

  // State
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rcClubId, setRcClubId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [rcRegattaId, setRcRegattaId] = useState('');

  // Auto-sync state
  const [togglingSync, setTogglingSync] = useState(false);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/regatta-central/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch {
      console.error('Failed to fetch RC status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch seasons for import
  const fetchSeasons = useCallback(async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
        // Default to first active season
        const activeSeason = data.seasons?.find((s: Season) => s.status === 'ACTIVE');
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id);
        }
      }
    } catch {
      console.error('Failed to fetch seasons');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSeasons();
  }, [fetchStatus, fetchSeasons]);

  // Handle connect
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);

    try {
      const response = await fetch('/api/regatta-central/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rcClubId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      toast.success('Regatta Central connected successfully');
      setShowConnectForm(false);
      setUsername('');
      setPassword('');
      setRcClubId('');
      fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    setDisconnecting(true);

    try {
      const response = await fetch('/api/regatta-central/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast.success('Regatta Central disconnected');
      setShowDisconnectConfirm(false);
      fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  // Handle import
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId || !rcRegattaId) {
      toast.error('Please select a season and enter a regatta ID');
      return;
    }

    setImporting(true);

    try {
      const response = await fetch('/api/regatta-central/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: selectedSeasonId, rcRegattaId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const result = await response.json();

      if (result.imported === 0 && result.updated === 0) {
        toast.info('No new regatta data to import');
      } else {
        toast.success(
          `Imported ${result.imported} new entries, updated ${result.updated}`,
          {
            action: {
              label: 'View Regattas',
              onClick: () => router.push(`/${teamSlug}/regattas`),
            },
          }
        );
      }

      setShowImportForm(false);
      setRcRegattaId('');
      fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Handle auto-sync toggle
  const handleToggleAutoSync = async () => {
    if (!status?.connected) return;
    setTogglingSync(true);

    const newValue = !status.autoSyncEnabled;

    try {
      const response = await fetch('/api/regatta-central/auto-sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update auto-sync');
      }

      setStatus(prev => prev ? { ...prev, autoSyncEnabled: newValue } : null);
      toast.success(`Auto-sync ${newValue ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update auto-sync setting');
    } finally {
      setTogglingSync(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-zinc-800 rounded w-2/3 mb-6"></div>
          <div className="h-10 bg-zinc-800 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Regatta Central</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Connect your Regatta Central account to automatically import regatta schedules and entries.
      </p>

      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-6">
        {status?.connected ? (
          <>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-zinc-300">
              Connected (Org: {status.rcClubId})
            </span>
          </>
        ) : (
          <>
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-600"></div>
            <span className="text-sm text-zinc-500">Not connected</span>
          </>
        )}
      </div>

      {/* Connected State */}
      {status?.connected && (
        <div className="space-y-6">
          {/* Auto-sync Toggle */}
          <div className="flex items-center justify-between py-3 border-t border-zinc-800">
            <div>
              <h3 className="text-sm font-medium text-zinc-300">Auto-sync</h3>
              <p className="text-sm text-zinc-500">
                Automatically sync regatta updates daily
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={status.autoSyncEnabled}
              disabled={togglingSync}
              onClick={handleToggleAutoSync}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900
                ${togglingSync ? 'cursor-not-allowed opacity-50' : ''}
                ${status.autoSyncEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}
              `}
            >
              <span className="sr-only">Enable auto-sync</span>
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow
                  transition duration-200 ease-in-out
                  ${status.autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Manual Import */}
          <div className="py-3 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-zinc-300">Import Regatta</h3>
                <p className="text-sm text-zinc-500">
                  Manually import a regatta from Regatta Central
                </p>
              </div>

              {!showImportForm && (
                <button
                  onClick={() => setShowImportForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Import
                </button>
              )}
            </div>

            {showImportForm && (
              <form onSubmit={handleImport} className="space-y-3 mt-4 p-4 bg-zinc-800/50 rounded-lg">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Season</label>
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a season</option>
                    {seasons.map(season => (
                      <option key={season.id} value={season.id}>
                        {season.name} {season.status === 'ACTIVE' ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Regatta Central ID</label>
                  <input
                    type="text"
                    value={rcRegattaId}
                    onChange={(e) => setRcRegattaId(e.target.value)}
                    placeholder="e.g., 12345"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 text-sm placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Find this ID in the URL on Regatta Central
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Import Regatta
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportForm(false);
                      setRcRegattaId('');
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Disconnect */}
          <div className="py-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-300">Disconnect</h3>
                <p className="text-sm text-zinc-500">
                  Remove Regatta Central connection
                </p>
              </div>

              {!showDisconnectConfirm ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Are you sure?</span>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(false)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disconnected State - Connect Button */}
      {!status?.connected && !showConnectForm && (
        <button
          onClick={() => setShowConnectForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
        >
          <LinkIcon className="h-4 w-4" />
          Connect Regatta Central
        </button>
      )}

      {/* Connect Form */}
      {!status?.connected && showConnectForm && (
        <form onSubmit={handleConnect} className="space-y-4 p-4 bg-zinc-800/50 rounded-lg">
          <p className="text-sm text-zinc-400 mb-4">
            Enter your Regatta Central credentials to connect your account.
          </p>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Your RC username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Your RC password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Organization ID
            </label>
            <input
              type="text"
              value={rcClubId}
              onChange={(e) => setRcClubId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., 12345"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Your Regatta Central org ID (not USRowing). Find it in the URL when viewing your club on regattacentral.com
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Connect
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConnectForm(false);
                setUsername('');
                setPassword('');
                setRcClubId('');
              }}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
