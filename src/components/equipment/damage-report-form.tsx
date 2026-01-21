'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDamageReportSchema, type CreateDamageReportInput } from '@/lib/validations/damage-report';
import { createClient } from '@/lib/supabase/client';
import { nanoid } from 'nanoid';

interface DamageReportFormProps {
  equipmentId: string;
  teamId: string;
}

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function DamageReportForm({ equipmentId, teamId }: DamageReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateDamageReportInput>({
    resolver: zodResolver(createDamageReportSchema),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError('Please select a JPG, PNG, or WebP image');
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setPhotoError('Photo must be less than 10MB');
      e.target.value = '';
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${equipmentId}/${nanoid()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('damage-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      throw new Error('Failed to upload photo');
    }

    const { data: urlData } = supabase.storage
      .from('damage-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const onSubmit = async (data: CreateDamageReportInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl: string | null = null;

      // Upload photo first if provided
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      // Submit damage report
      const response = await fetch(`/api/equipment/${equipmentId}/damage-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: data.location,
          description: data.description,
          photoUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report');
      }

      setIsSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message after submission
  if (isSuccess) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Report Submitted</h3>
          <p className="mt-2 text-sm text-gray-500">
            Thank you for reporting this damage. The coaching staff has been notified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
      {submitError && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {submitError}
        </div>
      )}

      {/* Location field */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Where on the equipment?
        </label>
        <input
          type="text"
          id="location"
          {...register('location')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., Port side rigger, Stern section"
        />
        {errors.location && (
          <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
        )}
      </div>

      {/* Description field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          What&apos;s wrong?
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Describe the damage in detail..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Photo upload */}
      <div>
        <label htmlFor="photo" className="block text-sm font-medium text-gray-700">
          Photo (optional)
        </label>
        <div className="mt-1">
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full max-h-48 object-cover rounded-md border border-gray-300"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="photo"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Take or upload a photo</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">JPG, PNG, or WebP up to 10MB</p>
              </div>
            </div>
          )}
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            capture="environment"
            onChange={handlePhotoChange}
            className={photoPreview ? 'hidden' : 'mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'}
          />
          {photoError && (
            <p className="mt-1 text-sm text-red-600">{photoError}</p>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
}
