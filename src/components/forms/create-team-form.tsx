'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema, type CreateTeamInput } from '@/lib/validations/team';
import { createClient } from '@/lib/supabase/client';

export function CreateTeamForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      primaryColor: '#1a365d',
      secondaryColor: '#e2e8f0',
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        setSubmitError('Logo must be a PNG or JPG file');
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setSubmitError('Logo must be less than 2MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setSubmitError(null);
    }
  };

  const onSubmit = async (data: CreateTeamInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Create team via API
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create team');
      }

      const teamId = result.team.id;
      const teamSlug = result.team.slug;

      // 2. Upload logo if provided
      if (logoFile) {
        const supabase = createClient();
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${teamId}/logo.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('team-assets')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          // Continue anyway - team was created successfully
        } else {
          // Get public URL and update team
          const { data: urlData } = supabase.storage
            .from('team-assets')
            .getPublicUrl(filePath);

          // Update team with logo URL
          await fetch(`/api/teams/${teamId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logoUrl: urlData.publicUrl }),
          });
        }
      }

      // 3. Refresh session to update JWT claims with new team info
      const supabaseForRefresh = createClient();
      await supabaseForRefresh.auth.refreshSession();

      // 4. Redirect to team dashboard
      router.push(`/${teamSlug}`);

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {submitError && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {submitError}
        </div>
      )}

      {/* Team Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Team Name
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter your team name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Primary Color */}
      <div>
        <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
          Primary Color
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="primaryColor"
            {...register('primaryColor')}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500">
            Main team color (e.g., for headers)
          </span>
        </div>
        {errors.primaryColor && (
          <p className="mt-1 text-sm text-red-600">{errors.primaryColor.message}</p>
        )}
      </div>

      {/* Secondary Color */}
      <div>
        <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">
          Secondary Color
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="secondaryColor"
            {...register('secondaryColor')}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500">
            Accent color (e.g., for highlights)
          </span>
        </div>
        {errors.secondaryColor && (
          <p className="mt-1 text-sm text-red-600">{errors.secondaryColor.message}</p>
        )}
      </div>

      {/* Logo Upload */}
      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
          Team Logo (optional)
        </label>
        <div className="mt-1 flex items-center gap-4">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-16 w-16 object-cover rounded-md border border-gray-300"
            />
          ) : (
            <div className="h-16 w-16 flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
              <span className="text-xs text-gray-400">No logo</span>
            </div>
          )}
          <input
            type="file"
            id="logo"
            accept="image/png,image/jpeg"
            onChange={handleLogoChange}
            className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          PNG or JPG, max 2MB
        </p>
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Team...' : 'Create Team'}
        </button>
      </div>
    </form>
  );
}
