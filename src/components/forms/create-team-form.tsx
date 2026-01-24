'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema, type CreateTeamInput } from '@/lib/validations/team';
import { createClient } from '@/lib/supabase/client';
import { LogoUploadField } from './logo-upload-field';
import { ColorPickerFields } from './color-picker-fields';
import { FormField } from '@/components/ui/form-field';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';

/**
 * Form for creating a new team.
 * Handles team name, slug, colors, and optional logo upload.
 * After successful creation, refreshes session and redirects to team dashboard.
 */
export function CreateTeamForm() {
  const router = useRouter();

  // --- Form State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      primaryColor: '#1a365d',
      secondaryColor: '#e2e8f0',
    },
  });

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
  };

  const onSubmit = async (data: CreateTeamInput) => {
    setIsSubmitting(true);

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

      // 2. Upload logo to Supabase Storage if provided
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

      showSuccessToast('Team created');

      // 4. Redirect to team dashboard
      router.push(`/${teamSlug}`);

    } catch (error) {
      showErrorToast({
        message: 'Failed to create team',
        description: error instanceof Error ? error.message : undefined,
        retry: () => onSubmit(data),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {/* Team Name */}
      <FormField
        label="Team Name"
        htmlFor="name"
        error={errors.name}
        required
      >
        <input
          type="text"
          id="name"
          {...register('name')}
          aria-invalid={errors.name ? 'true' : 'false'}
          className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your team name"
        />
      </FormField>

      {/* Color Pickers */}
      <ColorPickerFields register={register} errors={errors} />

      {/* Logo Upload */}
      <LogoUploadField onChange={handleLogoChange} />

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
