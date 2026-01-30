'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface InlineTextFieldProps {
  /** Current value */
  value: string;
  /** Called on blur with new value (should handle save) */
  onSave: (value: string) => void;
  /** Placeholder when empty */
  placeholder?: string;
  /** Whether save is in progress */
  isPending?: boolean;
  /** Additional class names */
  className?: string;
  /** Input type */
  type?: 'text' | 'time' | 'date';
  /** Whether field is disabled */
  disabled?: boolean;
  /** Minimum length for validation */
  minLength?: number;
  /** Maximum length for validation */
  maxLength?: number;
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

/**
 * Inline editable text field with autosave on blur.
 *
 * Styling:
 * - Transparent border by default (looks like plain text)
 * - Shows border on hover
 * - Focus state with emerald ring
 * - Reduced opacity when saving
 *
 * @example
 * <InlineTextField
 *   value={practice.name}
 *   onSave={(name) => updatePractice({ name })}
 *   placeholder="Practice name"
 *   aria-label="Practice name"
 * />
 */
export function InlineTextField({
  value,
  onSave,
  placeholder = 'Click to edit',
  isPending = false,
  className,
  type = 'text',
  disabled = false,
  minLength,
  maxLength,
  'aria-label': ariaLabel,
}: InlineTextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // Sync local value when prop changes (e.g., after external update)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    setError(null);

    // Trim whitespace
    const trimmed = localValue.trim();

    // Validate
    if (minLength && trimmed.length < minLength) {
      setError(`Minimum ${minLength} characters`);
      setLocalValue(value); // Reset to original
      return;
    }
    if (maxLength && trimmed.length > maxLength) {
      setError(`Maximum ${maxLength} characters`);
      setLocalValue(value); // Reset to original
      return;
    }

    // Only save if changed
    if (trimmed !== value) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value); // Reset on escape
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isPending}
        minLength={minLength}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        className={cn(
          // Base styles - looks like plain text
          'w-full bg-transparent border border-transparent rounded-md px-2 py-1',
          'text-zinc-100 placeholder-zinc-500',
          // Hover shows border
          'hover:border-zinc-700',
          // Focus styles
          'focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500',
          // Pending state
          isPending && 'opacity-50 cursor-wait',
          // Disabled state
          disabled && 'cursor-not-allowed opacity-40',
          // Error state
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          // Time/date inputs need color-scheme for dark mode
          (type === 'time' || type === 'date') && '[color-scheme:dark]',
          className
        )}
      />
      {error && (
        <p className="absolute -bottom-5 left-0 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
