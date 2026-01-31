'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { generateSlug } from '@/lib/utils/slug';
import { cn } from '@/lib/utils';

/**
 * Validation schema for facility form.
 * Mirrors createFacilitySchema but with all fields for the form.
 */
const facilityFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .max(50, 'Slug must be at most 50 characters')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'Address must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .max(100, 'City must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  state: z
    .string()
    .max(100, 'State must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  country: z
    .string()
    .max(2, 'Country must be a 2-letter code')
    .optional()
    .or(z.literal('')),
  timezone: z.string().optional().or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Phone must be at most 20 characters')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

type FacilityFormData = z.infer<typeof facilityFormSchema>;

interface FacilityFormProps {
  /**
   * Form mode: 'create' for new facilities, 'edit' for existing facilities.
   */
  mode: 'create' | 'edit';
  /**
   * Facility ID for edit mode. Required when mode is 'edit'.
   */
  facilityId?: string;
  /**
   * Default values to pre-populate the form.
   */
  defaultValues?: Partial<FacilityFormData>;
}

/**
 * Reusable form component for creating and editing facilities.
 *
 * Create mode:
 * - POSTs to /api/admin/facilities
 * - Auto-generates slug from name if left empty
 *
 * Edit mode:
 * - PATCHes to /api/admin/facilities/[facilityId]
 * - Updates existing facility data
 *
 * Uses react-hook-form with zod validation and mode: 'onTouched'.
 */
export function FacilityForm({ mode, facilityId, defaultValues }: FacilityFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FacilityFormData>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      slug: defaultValues?.slug || '',
      address: defaultValues?.address || '',
      city: defaultValues?.city || '',
      state: defaultValues?.state || '',
      country: defaultValues?.country || 'US',
      timezone: defaultValues?.timezone || 'America/New_York',
      phone: defaultValues?.phone || '',
      email: defaultValues?.email || '',
      website: defaultValues?.website || '',
      description: defaultValues?.description || '',
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  const currentSlug = watch('slug');

  /**
   * Auto-generate slug from name on blur (create mode only, if slug is empty)
   */
  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (mode === 'create' && !currentSlug && e.target.value) {
      const generatedSlug = generateSlug(e.target.value);
      setValue('slug', generatedSlug);
    }
  };

  const onSubmit = async (data: FacilityFormData) => {
    try {
      const url =
        mode === 'create'
          ? '/api/admin/facilities'
          : `/api/admin/facilities/${facilityId}`;

      // Clean up empty strings to undefined for optional fields
      const cleanedData = {
        ...data,
        slug: data.slug || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        timezone: data.timezone || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        website: data.website || undefined,
        description: data.description || undefined,
      };

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save facility');
      }

      showSuccessToast(
        mode === 'create'
          ? 'Facility created successfully'
          : 'Facility updated successfully'
      );

      router.push('/admin/facilities');
      router.refresh();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to save facility',
        retry: () => onSubmit(data),
      });
    }
  };

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';

  const textareaClassName = cn(
    'mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm',
    'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500',
    'resize-none'
  );

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'Create Facility' : 'Edit Facility'}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {mode === 'create'
            ? 'Create a new facility. Clubs can be added to this facility after creation.'
            : 'Update facility information.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Basic Information
          </h3>

          {/* Name */}
          <FormField
            label="Name"
            htmlFor="name"
            error={errors.name}
            required
          >
            <Input
              id="name"
              {...register('name')}
              onBlur={handleNameBlur}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={inputClassName}
              placeholder="Riverside Rowing Center"
            />
          </FormField>

          {/* Slug */}
          <FormField
            label="Slug"
            htmlFor="slug"
            error={errors.slug}
            hint={
              mode === 'create'
                ? 'URL identifier. Will be auto-generated from name if left empty.'
                : 'URL identifier for the facility.'
            }
          >
            <Input
              id="slug"
              {...register('slug')}
              aria-invalid={errors.slug ? 'true' : 'false'}
              className={inputClassName}
              placeholder="riverside-rowing-center"
            />
          </FormField>

          {/* Description */}
          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description}
          >
            <textarea
              id="description"
              {...register('description')}
              aria-invalid={errors.description ? 'true' : 'false'}
              className={textareaClassName}
              placeholder="A brief description of the facility..."
              rows={3}
              maxLength={500}
            />
          </FormField>
        </div>

        {/* Section: Location */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Location
          </h3>

          {/* Address */}
          <FormField
            label="Address"
            htmlFor="address"
            error={errors.address}
          >
            <Input
              id="address"
              {...register('address')}
              aria-invalid={errors.address ? 'true' : 'false'}
              className={inputClassName}
              placeholder="123 River Road"
            />
          </FormField>

          {/* City, State row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="City"
              htmlFor="city"
              error={errors.city}
            >
              <Input
                id="city"
                {...register('city')}
                aria-invalid={errors.city ? 'true' : 'false'}
                className={inputClassName}
                placeholder="Boston"
              />
            </FormField>

            <FormField
              label="State"
              htmlFor="state"
              error={errors.state}
            >
              <Input
                id="state"
                {...register('state')}
                aria-invalid={errors.state ? 'true' : 'false'}
                className={inputClassName}
                placeholder="MA"
              />
            </FormField>
          </div>

          {/* Country, Timezone row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Country"
              htmlFor="country"
              error={errors.country}
              hint="2-letter country code (e.g., US, CA, GB)"
            >
              <Input
                id="country"
                {...register('country')}
                aria-invalid={errors.country ? 'true' : 'false'}
                className={inputClassName}
                placeholder="US"
              />
            </FormField>

            <FormField
              label="Timezone"
              htmlFor="timezone"
              error={errors.timezone}
            >
              <Input
                id="timezone"
                {...register('timezone')}
                aria-invalid={errors.timezone ? 'true' : 'false'}
                className={inputClassName}
                placeholder="America/New_York"
              />
            </FormField>
          </div>
        </div>

        {/* Section: Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Contact Information
          </h3>

          {/* Phone */}
          <FormField
            label="Phone"
            htmlFor="phone"
            error={errors.phone}
          >
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              aria-invalid={errors.phone ? 'true' : 'false'}
              className={inputClassName}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>

          {/* Email */}
          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email}
          >
            <Input
              id="email"
              type="email"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              className={inputClassName}
              placeholder="info@facility.com"
            />
          </FormField>

          {/* Website */}
          <FormField
            label="Website"
            htmlFor="website"
            error={errors.website}
          >
            <Input
              id="website"
              type="url"
              {...register('website')}
              aria-invalid={errors.website ? 'true' : 'false'}
              className={inputClassName}
              placeholder="https://www.facility.com"
            />
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[var(--border-subtle)]">
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Create Facility' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
