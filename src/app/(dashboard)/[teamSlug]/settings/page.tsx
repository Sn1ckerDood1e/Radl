'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/components/providers/theme-provider';
import { NotificationSettings } from '@/components/pwa/notification-settings';
import { RCSettingsSection } from '@/components/regatta-central/rc-settings-section';
import { REGATTA_REGIONS } from '@/lib/validations/team-settings';

interface Coach {
  userId: string;
  displayName: string;
}

interface TeamSettings {
  damageNotifyUserIds: string[];
  readinessInspectSoonDays: number;
  readinessNeedsAttentionDays: number;
  readinessOutOfServiceDays: number;
  regattaRegions: string[];
}

interface TeamInfo {
  name: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savingRegions, setSavingRegions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);
  const [regionSuccess, setRegionSuccess] = useState(false);

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [settings, setSettings] = useState<TeamSettings>({
    damageNotifyUserIds: [],
    readinessInspectSoonDays: 14,
    readinessNeedsAttentionDays: 21,
    readinessOutOfServiceDays: 30,
    regattaRegions: [],
  });
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set());

  const [inspectSoonDays, setInspectSoonDays] = useState(14);
  const [needsAttentionDays, setNeedsAttentionDays] = useState(21);
  const [outOfServiceDays, setOutOfServiceDays] = useState(30);
  const [regattaRegions, setRegattaRegions] = useState<string[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const [teamInfo, setTeamInfo] = useState<TeamInfo>({ name: '', primaryColor: '', secondaryColor: '' });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/team-settings');

        if (response.status === 403) {
          router.push(`/${teamSlug}`);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        setCoaches(data.coaches);
        setSettings(data.settings);
        setSelectedCoaches(new Set(data.settings.damageNotifyUserIds || []));

        if (data.settings) {
          setInspectSoonDays(data.settings.readinessInspectSoonDays ?? 14);
          setNeedsAttentionDays(data.settings.readinessNeedsAttentionDays ?? 21);
          setOutOfServiceDays(data.settings.readinessOutOfServiceDays ?? 30);
          setRegattaRegions(data.settings.regattaRegions || []);
        }

        if (data.team) {
          setTeamInfo(data.team);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [teamSlug, router]);

  const handleCoachToggle = (userId: string) => {
    setSelectedCoaches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
    setSuccess(false);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/team-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          damageNotifyUserIds: Array.from(selectedCoaches),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasNotificationChanges = () => {
    const currentIds = new Set(settings.damageNotifyUserIds || []);
    if (currentIds.size !== selectedCoaches.size) return true;
    for (const id of selectedCoaches) {
      if (!currentIds.has(id)) return true;
    }
    return false;
  };

  const handleSaveThresholds = async () => {
    setSavingThresholds(true);
    setError(null);
    setThresholdSuccess(false);

    try {
      const response = await fetch('/api/team-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readinessInspectSoonDays: inspectSoonDays,
          readinessNeedsAttentionDays: needsAttentionDays,
          readinessOutOfServiceDays: outOfServiceDays,
        }),
      });

      if (!response.ok) throw new Error('Failed to save thresholds');

      setThresholdSuccess(true);
      setTimeout(() => setThresholdSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save thresholds');
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleSaveRegions = async () => {
    setSavingRegions(true);
    setError(null);
    setRegionSuccess(false);

    try {
      const response = await fetch('/api/team-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regattaRegions }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save regions');
      }

      setSettings(prev => ({ ...prev, regattaRegions }));
      setRegionSuccess(true);
      setTimeout(() => setRegionSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save regions');
    } finally {
      setSavingRegions(false);
    }
  };

  const hasRegionChanges = () => {
    const currentRegions = settings.regattaRegions || [];
    if (currentRegions.length !== regattaRegions.length) return true;
    return !currentRegions.every(r => regattaRegions.includes(r));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sign out');
      }

      // Redirect to login page
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-800 rounded w-1/4 mb-8"></div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
            <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-10 bg-zinc-800 rounded"></div>
              <div className="h-10 bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/${teamSlug}`}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Equipment Readiness Thresholds */}
      <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Equipment Readiness Thresholds</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Configure when equipment is flagged for inspection based on days since last inspection.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              Inspect Soon (yellow) - days
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={inspectSoonDays}
              onChange={(e) => setInspectSoonDays(parseInt(e.target.value) || 14)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              Needs Attention (amber) - days
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={needsAttentionDays}
              onChange={(e) => setNeedsAttentionDays(parseInt(e.target.value) || 21)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">
              Out of Service (red) - days
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={outOfServiceDays}
              onChange={(e) => setOutOfServiceDays(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            onClick={handleSaveThresholds}
            disabled={savingThresholds}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {savingThresholds ? 'Saving...' : 'Save Thresholds'}
          </button>

          {thresholdSuccess && (
            <p className="text-sm text-teal-400">Thresholds saved successfully!</p>
          )}
        </div>
      </div>

      {/* Regatta Central Section */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          Regatta Central
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          Select regions to show upcoming regattas on your calendar.
        </p>

        {/* Region Success Alert */}
        {regionSuccess && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>Regatta regions saved successfully</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-300">
            Regatta Regions
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {REGATTA_REGIONS.map((region) => (
              <label
                key={region.code}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={regattaRegions.includes(region.code)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRegattaRegions([...regattaRegions, region.code]);
                    } else {
                      setRegattaRegions(regattaRegions.filter(r => r !== region.code));
                    }
                  }}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm text-zinc-300">{region.name}</span>
              </label>
            ))}
          </div>
          {regattaRegions.length === 0 && (
            <p className="text-xs text-zinc-500">
              No regions selected. United States will be used by default.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSaveRegions}
            disabled={savingRegions || !hasRegionChanges()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              savingRegions || !hasRegionChanges()
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {savingRegions ? 'Saving...' : 'Save Regions'}
          </button>
          {hasRegionChanges() && (
            <span className="text-sm text-zinc-500">You have unsaved changes</span>
          )}
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-zinc-900 dark:bg-zinc-900 light:bg-white rounded-xl border border-zinc-800 dark:border-zinc-800 light:border-zinc-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-zinc-900 mb-2">Appearance</h2>
        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-6">
          Choose how Radl looks to you. Select a theme or sync with your system.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {/* Light Theme */}
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === 'light'
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white border border-zinc-300 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${theme === 'light' ? 'text-teal-400' : 'text-zinc-300'}`}>
                Light
              </span>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === 'dark'
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-teal-400' : 'text-zinc-300'}`}>
                Dark
              </span>
            </div>
          </button>

          {/* System Theme */}
          <button
            onClick={() => setTheme('system')}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === 'system'
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white to-zinc-900 border border-zinc-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${theme === 'system' ? 'text-teal-400' : 'text-zinc-300'}`}>
                System
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Push Notifications Section */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Push Notifications</h2>
        <NotificationSettings />
      </div>

      {/* Security Settings Link */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Security</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Manage two-factor authentication and access permissions.
        </p>
        <Link
          href={`/${teamSlug}/settings/security`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Security Settings
        </Link>
      </div>

      {/* Account Section */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Account</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Sign out of your Radl account on this device.
        </p>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>

      {/* Regatta Central Settings Section */}
      <RCSettingsSection />
      <div className="mb-6"></div>

      {/* Damage Report Notification Settings */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Damage Report Recipients</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Configure who receives notifications when damage is reported on equipment.
        </p>

        {/* Success Alert */}
        {success && (
          <div className="mb-4 bg-teal-500/10 border border-teal-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-teal-400 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>Settings saved successfully</p>
            </div>
          </div>
        )}

        <div className="border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">
            Damage Report Recipients
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Select which coaches should receive notifications when a damage report is submitted.
          </p>

          {coaches.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No coaches found on this team.</p>
          ) : (
            <div className="space-y-2">
              {coaches.map(coach => (
                <label
                  key={coach.userId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCoaches.has(coach.userId)}
                    onChange={() => handleCoachToggle(coach.userId)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-900"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">
                      {coach.displayName}
                    </span>
                  </div>
                  {selectedCoaches.has(coach.userId) && (
                    <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
                      Will receive notifications
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Save Notifications Button */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSaveNotifications}
              disabled={saving || !hasNotificationChanges()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                saving || !hasNotificationChanges()
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {hasNotificationChanges() && (
              <span className="text-sm text-zinc-500">You have unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-6 opacity-60">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-zinc-500">
          Delete team and all associated data. <span className="italic">Coming soon</span>
        </p>
      </div>
    </div>
  );
}
