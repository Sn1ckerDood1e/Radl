'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';

/**
 * Validation schema for user form.
 * Email is always required; displayName and phone are optional.
 */
const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  /**
   * Form mode: 'create' for new users, 'edit' for existing users.
   */
  mode: 'create' | 'edit';
  /**
   * User ID for edit mode. Required when mode is 'edit'.
   */
  userId?: string;
  /**
   * Default values to pre-populate the form.
   */
  defaultValues?: Partial<UserFormData>;
}

/**
 * Reusable form component for creating and editing users.
 *
 * Create mode:
 * - POSTs to /api/admin/users
 * - Sends password setup email via Supabase invite
 *
 * Edit mode:
 * - PATCHes to /api/admin/users/[userId]
 * - Email field is disabled (Supabase limitation)
 *
 * Uses react-hook-form with zod validation.
 */
export function UserForm({ mode, userId, defaultValues }: UserFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: defaultValues?.email || '',
      displayName: defaultValues?.displayName || '',
      phone: defaultValues?.phone || '',
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      const url = mode === 'create'
        ? '/api/admin/users'
        : `/api/admin/users/${userId}`;

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      showSuccessToast(
        mode === 'create'
          ? 'User created! Password setup email sent.'
          : 'User updated successfully'
      );

      router.push('/admin/users');
      router.refresh();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to save user',
        retry: () => onSubmit(data),
      });
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'Create User' : 'Edit User'}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {mode === 'create'
            ? 'Create a new user. They will receive an email to set their password.'
            : 'Update user profile information.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email}
          required
          hint={mode === 'edit' ? 'Email cannot be changed after account creation' : undefined}
        >
          <Input
            id="email"
            type="email"
            {...register('email')}
            disabled={mode === 'edit'}
            aria-invalid={errors.email ? 'true' : 'false'}
            className={inputClassName}
            placeholder="user@example.com"
          />
        </FormField>

        {/* Display Name */}
        <FormField
          label="Display Name"
          htmlFor="displayName"
          error={errors.displayName}
        >
          <Input
            id="displayName"
            {...register('displayName')}
            aria-invalid={errors.displayName ? 'true' : 'false'}
            className={inputClassName}
            placeholder="John Smith"
          />
        </FormField>

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

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Create User' : 'Save Changes'}
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
