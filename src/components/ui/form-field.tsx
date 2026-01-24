import * as React from 'react';
import { cn } from '@/lib/utils';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: FieldError;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField wrapper component for consistent validation display.
 * Shows required indicator, hint text, and animated error messages.
 *
 * @param label - Field label text
 * @param htmlFor - ID of the input element
 * @param error - Field error from react-hook-form
 * @param required - Whether field is required (shows * indicator)
 * @param hint - Optional hint text shown when no error
 * @param children - Form input element
 * @param className - Optional additional classes for the container
 */
export function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-200">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {children}

      {/* Error message with animation */}
      {error && (
        <p className="mt-1 text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
          {error.message}
        </p>
      )}

      {/* Hint text (only shown when no error) */}
      {!error && hint && (
        <p className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}
