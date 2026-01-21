'use client';

import { useState } from 'react';

interface LogoUploadFieldProps {
  onChange: (file: File | null) => void;
}

/**
 * Logo upload field with preview and validation.
 * Validates file type (PNG/JPG) and size (max 2MB).
 */
export function LogoUploadField({ onChange }: LogoUploadFieldProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onChange(null);
      return;
    }

    // Validate file type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setUploadError('Logo must be a PNG or JPG file');
      onChange(null);
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Logo must be less than 2MB');
      onChange(null);
      return;
    }

    setLogoPreview(URL.createObjectURL(file));
    setUploadError(null);
    onChange(file);
  };

  return (
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
          onChange={handleFileChange}
          className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">PNG or JPG, max 2MB</p>
      {uploadError && (
        <p className="mt-1 text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
