'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings, Loader2, Save, Building2, Calendar, Globe, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Facility {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  bookingWindowDays: number;
}

export default function FacilitySettingsPage() {
  const params = useParams();
  const facilitySlug = params.facilitySlug as string;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    timezone: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    bookingWindowDays: 30,
  });

  // Load facility data
  useEffect(() => {
    async function loadFacility() {
      try {
        const facilityRes = await fetch(`/api/facility/by-slug/${facilitySlug}`);
        if (!facilityRes.ok) throw new Error('Failed to get facility');
        const { facility: fac } = await facilityRes.json();

        const settingsRes = await fetch(`/api/facility/${fac.id}/settings`);
        if (!settingsRes.ok) throw new Error('Failed to get settings');
        const { facility: settings } = await settingsRes.json();

        setFacility(settings);
        setFormData({
          name: settings.name || '',
          address: settings.address || '',
          city: settings.city || '',
          state: settings.state || '',
          country: settings.country || '',
          timezone: settings.timezone || 'America/New_York',
          phone: settings.phone || '',
          email: settings.email || '',
          website: settings.website || '',
          description: settings.description || '',
          bookingWindowDays: settings.bookingWindowDays || 30,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    loadFacility();
  }, [facilitySlug]);

  const handleSave = async () => {
    if (!facility) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/facility/${facility.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save settings');
      }

      const { facility: updated } = await response.json();
      setFacility(updated);
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    );
  }

  if (error && !facility) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/facility/${facilitySlug}`}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Settings className="h-6 w-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facility Settings</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Configure {facility?.name} settings and booking rules
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Booking Settings */}
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Booking Settings</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Equipment Booking Window (days)
            </label>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              How far in advance clubs can book shared equipment
            </p>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={365}
                value={formData.bookingWindowDays}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  bookingWindowDays: parseInt(e.target.value) || 30,
                }))}
                className="w-32"
              />
              <span className="text-sm text-[var(--text-muted)]">
                Clubs can book up to {formData.bookingWindowDays} day{formData.bookingWindowDays !== 1 ? 's' : ''} in advance
              </span>
            </div>
          </div>
        </div>

        {/* Facility Profile */}
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Facility Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Facility Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="About this facility..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Address
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 River Road"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  City
                </label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  State/Province
                </label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Country
                </label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="US"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Timezone
                </label>
                <Input
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  placeholder="America/New_York"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Contact Information</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="info@facility.com"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Globe className="h-4 w-4" />
                Website
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://facility.com"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
